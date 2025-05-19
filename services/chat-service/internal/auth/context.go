package auth

import "context"

type (
	userIDKey struct{}
	roleKey   struct{}
)

// WithUser кладёт userID и role в контекст
func WithUser(ctx context.Context, userID int64, role string) context.Context {
	ctx = context.WithValue(ctx, userIDKey{}, userID)
	ctx = context.WithValue(ctx, roleKey{}, role)
	return ctx
}

// FromContext извлекает userID и role из контекста.
// Если userID==0, значит аноним.
func FromContext(ctx context.Context) (userID int64, role string) {
	if v := ctx.Value(userIDKey{}); v != nil {
		if id, ok := v.(int64); ok {
			userID = id
		}
	}
	if v := ctx.Value(roleKey{}); v != nil {
		if r, ok := v.(string); ok {
			role = r
		}
	}
	return
}
