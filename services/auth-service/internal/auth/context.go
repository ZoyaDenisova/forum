package auth

import (
	"context"
	"github.com/ZoyaDenisova/go-common/contextkeys"
)

// WithUser кладёт userID и role в контекст
func WithUser(ctx context.Context, userID int64, role string) context.Context {
	ctx = context.WithValue(ctx, contextkeys.UserIDKey{}, userID)
	ctx = context.WithValue(ctx, contextkeys.RoleKey{}, role)
	return ctx
}

// FromContext извлекает userID и role из контекста.
// Если userID==0, значит аноним.
func FromContext(ctx context.Context) (userID int64, role string) {
	if v := ctx.Value(contextkeys.UserIDKey{}); v != nil {
		if id, ok := v.(int64); ok {
			userID = id
		}
	}
	if v := ctx.Value(contextkeys.RoleKey{}); v != nil {
		if r, ok := v.(string); ok {
			role = r
		}
	}
	return
}
