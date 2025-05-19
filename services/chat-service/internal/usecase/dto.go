package usecase

type CreateCategoryParams struct {
	Title       string
	Description string
}

type SendMessageParams struct {
	TopicID  int64
	AuthorID int64 // берётся из контекста (middleware)
	Content  string
}
type TopicParams struct {
	CategoryID  int64
	Title       string
	Description string
	AuthorID    int64 // берётся из контекста авторизации
}
