package transportgrpc

import (
	"context"
	"github.com/ZoyaDenisova/go-common/logger"

	authpb "auth-service/cmd/app/docs/proto"
)

type AuthServer struct {
	authpb.UnimplementedAuthServiceServer
	logger logger.Interface
}

func NewAuthServer(logger logger.Interface) *AuthServer {
	return &AuthServer{
		logger: logger,
	}
}

// todo rename to VerifyToken (было Validate)
func (s *AuthServer) VerifyToken(
	ctx context.Context,
	_ *authpb.VerifyTokenRequest,
) (*authpb.VerifyTokenResponse, error) {
	s.logger.Info("VerifyToken called")

	userID, role := FromContext(ctx)
	s.logger.Debug("Extracted from context", "userID", userID, "role", role)

	resp := &authpb.VerifyTokenResponse{
		UserId: userID,
		Role:   role,
	}

	s.logger.Info("VerifyToken successful", "userID", userID, "role", role)
	return resp, nil
}
