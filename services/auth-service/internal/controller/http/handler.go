package http

import (
	"auth-service/config"
	dbErrors "auth-service/internal/errors"
	"auth-service/internal/usecase"
	"errors"
	"github.com/ZoyaDenisova/go-common/logger"
	"github.com/gin-gonic/gin"
	"net/http"
)

const (
	RefreshCookieName = "refresh_token"
)

// Handler обрабатывает HTTP-запросы
type Handler struct {
	log    logger.Interface
	cfg    *config.Config
	userUC usecase.User
	sessUC usecase.Session
}

// NewHandler создаёт новый Handler
func NewHandler(
	log logger.Interface,
	u usecase.User,
	s usecase.Session,
	cfg *config.Config,
) *Handler {
	return &Handler{log: log, cfg: cfg, userUC: u, sessUC: s}
}

// Register — POST /auth/register
// @Summary      Register new user
// @Description  Create a new user account
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        request  body      RegisterRequest  true  "Register payload"
// @Success      201      {string}  string           "Created"
// @Failure      400      {object}  ErrorResponse
// @Failure      409      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Router       /auth/register [post]
func (h *Handler) Register(c *gin.Context) {
	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	if err := h.userUC.Register(c.Request.Context(), req.Name, req.Email, req.Password); err != nil {
		if errors.Is(err, usecase.ErrUserExists) {
			c.AbortWithStatusJSON(http.StatusConflict, ErrorResponse{Code: "USER_EXISTS", Message: "user already exists"})
			return
		}

		h.log.Error("Register failed", "err", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		return
	}

	c.Status(http.StatusCreated)
}

// Login — POST /auth/login
// @Summary      Authenticate user
// @Description  Log in user; returns accessToken in JSON and refreshToken in HttpOnly cookie
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        request  body      LoginRequest   true  "Login payload"
// @Success      200      {object}  TokenResponse
// @Header       200      {string}  Set-Cookie     "refresh_token cookie"
// @Failure      400      {object}  ErrorResponse
// @Failure      401      {object}  ErrorResponse
// @Failure      500      {object}  ErrorResponse
// @Router       /auth/login [post]
func (h *Handler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	access, refresh, err := h.userUC.Login(c.Request.Context(), req.Email, req.Password, c.Request.UserAgent())
	if err != nil {
		if errors.Is(err, usecase.ErrInvalidCreds) {
			c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{
				Code:    "INVALID_CREDENTIALS",
				Message: "invalid credentials",
			})
			return
		}
		h.log.Error("Login failed", "err", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		return
	}

	// устанавливаем refresh-token в HttpOnly cookie
	ttl := int(h.cfg.JWT.RefreshTTL.Seconds())
	c.SetCookie(RefreshCookieName, refresh, ttl, "/", "", true, true)
	c.Header("Set-Cookie", c.Writer.Header().Get("Set-Cookie")+"; SameSite=Strict")

	// возвращаем access-token
	c.JSON(http.StatusOK, TokenResponse{AccessToken: access})
}

// Me — GET /auth/me
// @Summary      Get current user
// @Description  Return profile of authenticated user
// @Tags         Auth
// @Security     BearerAuth
// @Produce      json
// @Success      200 {object} UserResponse
// @Failure      401 {object} ErrorResponse
// @Failure      404 {object} ErrorResponse
// @Failure      500 {object} ErrorResponse
// @Router       /auth/me [get]
func (h *Handler) Me(c *gin.Context) {
	userID, _ := UserIDFromCtx(c.Request.Context())
	if userID == 0 {
		c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{
			Code:    "UNAUTHORIZED",
			Message: "access token required",
		})
		return
	}

	user, err := h.userUC.GetByID(c.Request.Context(), userID)
	if err != nil {
		if errors.Is(err, dbErrors.ErrNotFound) {
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{
				Code:    "USER_NOT_FOUND",
				Message: "user not found",
			})
			return
		}
		h.log.Error("get user by ID failed", "err", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{
			Code:    "INTERNAL_SERVER_ERROR",
			Message: "failed to fetch user",
		})
		return
	}

	resp := UserResponse{
		ID:        user.ID,
		Name:      user.Name,
		Email:     user.Email,
		Role:      user.Role,
		CreatedAt: user.CreatedAt,
	}

	c.JSON(http.StatusOK, resp)
}

// UpdateUser — PATCH /auth/user
// @Summary      Partially update own profile
// @Description  Updates only the specified fields (name, email, password) for the current user
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        request body      UpdateUserRequest  true  "Поля для обновления"
// @Success      204
// @Failure      400 {object} ErrorResponse
// @Failure      401 {object} ErrorResponse
// @Failure      404 {object} ErrorResponse
// @Failure      409 {object} ErrorResponse
// @Failure      500 {object} ErrorResponse
// @Security     BearerAuth
// @Router       /auth/user [patch]
func (h *Handler) UpdateUser(c *gin.Context) {
	var req UpdateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{Message: err.Error()})
		return
	}

	userID, _ := UserIDFromCtx(c.Request.Context())

	params := usecase.UpdateUserParams{
		Name:     req.Name,
		Email:    req.Email,
		Password: req.Password,
	}

	if err := h.userUC.Update(c.Request.Context(), userID, params); err != nil {
		switch {
		case errors.Is(err, usecase.ErrUserExists):
			c.AbortWithStatusJSON(http.StatusConflict, ErrorResponse{
				Code:    "USER_EXISTS",
				Message: "email already in use",
			})
		case errors.Is(err, dbErrors.ErrNotFound):
			c.AbortWithStatusJSON(http.StatusNotFound, ErrorResponse{
				Code:    "USER_NOT_FOUND",
				Message: "user not found",
			})
		default:
			h.log.Error("UpdateUser failed", "err", err)
			c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{Message: "internal server error"})
		}
		return
	}

	c.Status(http.StatusNoContent)
}

// Refresh — POST /auth/refresh
// @Summary      Refresh tokens
// @Description  Generate new accessToken and refreshToken; reads refreshToken from HttpOnly cookie
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Success      200      {object}  TokenResponse
// @Header       200      {string}  Set-Cookie     "refresh_token cookie"
// @Failure      400      {object}  ErrorResponse
// @Failure      401      {object}  ErrorResponse
// @Router       /auth/refresh [post]
func (h *Handler) Refresh(c *gin.Context) {
	rt, err := c.Cookie(RefreshCookieName)
	if err != nil || rt == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{
			Code:    "NO_REFRESH_TOKEN",
			Message: "refresh token is missing",
		})
		return
	}

	access, newRT, err := h.sessUC.Refresh(c.Request.Context(), rt)
	if err != nil {
		h.log.Warn("Refresh failed", "err", err)
		c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{
			Code:    "INVALID_TOKEN",
			Message: "invalid or expired refresh token",
		})
		return
	}

	// обновляем cookie
	ttl := int(h.cfg.JWT.RefreshTTL.Seconds())
	c.SetCookie(RefreshCookieName, newRT, ttl, "/", "", true, true)
	c.Header("Set-Cookie", c.Writer.Header().Get("Set-Cookie")+"; SameSite=Strict")

	c.JSON(http.StatusOK, TokenResponse{AccessToken: access})
}

// GetSessions — GET /auth/sessions
// @Summary      List user sessions
// @Description  Returns all active sessions for the user
// @Tags         Auth
// @Produce      json
// @Success      200  {array}  SessionResponse
// @Failure      401  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /auth/sessions [get]
func (h *Handler) GetSessions(c *gin.Context) {
	userID, _ := UserIDFromCtx(c.Request.Context())
	if userID == 0 {
		c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{
			Code:    "UNAUTHORIZED",
			Message: "access token required",
		})
		return
	}

	sessions, err := h.sessUC.List(c.Request.Context(), userID)
	if err != nil {
		h.log.Error("GetSessions failed", "err", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{
			Message: "failed to list sessions",
		})
		return
	}

	var out []SessionResponse
	for _, s := range sessions {
		out = append(out, SessionResponse{
			ID:        s.ID,
			UserAgent: s.UserAgent,
			CreatedAt: s.CreatedAt,
			ExpiresAt: s.ExpiresAt,
		})
	}

	c.JSON(http.StatusOK, out)
}

// DeleteSession — DELETE /auth/session
// @Summary      Revoke current session
// @Description  Log out current session by revoking refreshToken from cookie
// @Tags         Auth
// @Produce      json
// @Success      204
// @Failure      400  {object}  ErrorResponse
// @Failure      401  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /auth/session [delete]
func (h *Handler) DeleteSession(c *gin.Context) {
	rt, err := c.Cookie(RefreshCookieName)
	if err != nil || rt == "" {
		c.AbortWithStatusJSON(http.StatusBadRequest, ErrorResponse{
			Code:    "NO_REFRESH_TOKEN",
			Message: "refresh token is missing",
		})
		return
	}

	if err := h.sessUC.Revoke(c.Request.Context(), rt); err != nil {
		h.log.Error("Revoke session failed", "err", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{
			Message: "failed to revoke session",
		})
		return
	}

	// удаляем cookie
	c.SetCookie(RefreshCookieName, "", -1, "/", "", true, true)
	c.Header("Set-Cookie", c.Writer.Header().Get("Set-Cookie")+"; SameSite=Strict")

	c.Status(http.StatusNoContent)
}

// DeleteAllSessions — DELETE /auth/sessions
// @Summary      Revoke all sessions
// @Description  Log out all sessions for the current user
// @Tags         Auth
// @Produce      json
// @Success      204
// @Failure      401  {object}  ErrorResponse
// @Failure      500  {object}  ErrorResponse
// @Security     BearerAuth
// @Router       /auth/sessions [delete]
func (h *Handler) DeleteAllSessions(c *gin.Context) {
	uid, _ := UserIDFromCtx(c.Request.Context())
	if uid == 0 {
		c.AbortWithStatusJSON(http.StatusUnauthorized, ErrorResponse{
			Code:    "UNAUTHORIZED",
			Message: "access token required",
		})
		return
	}

	if err := h.sessUC.RevokeAll(c.Request.Context(), uid); err != nil {
		h.log.Error("Revoke all sessions failed", "err", err)
		c.AbortWithStatusJSON(http.StatusInternalServerError, ErrorResponse{
			Message: "failed to revoke all sessions",
		})
		return
	}

	// удаляем текущую cookie
	c.SetCookie(RefreshCookieName, "", -1, "/", "", true, true)
	c.Header("Set-Cookie", c.Writer.Header().Get("Set-Cookie")+"; SameSite=Strict")

	c.Status(http.StatusNoContent)
}
