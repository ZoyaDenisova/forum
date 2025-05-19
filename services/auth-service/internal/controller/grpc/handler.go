package grpc

import (
	"context"

	authpb "auth-service/cmd/app/docs/proto"
)

type AuthServer struct {
	authpb.UnimplementedAuthServiceServer
}

func NewAuthServer() *AuthServer {
	return &AuthServer{}
}

// todo rename to VerifyToken (было Validate)
func (s *AuthServer) VerifyToken(
	ctx context.Context,
	_ *authpb.VerifyTokenRequest,
) (*authpb.VerifyTokenResponse, error) {
	userID, role := FromContext(ctx)
	return &authpb.VerifyTokenResponse{
		UserId: userID,
		Role:   role,
	}, nil
}
