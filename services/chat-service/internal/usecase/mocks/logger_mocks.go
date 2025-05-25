package mocks

// fakeLogger — заглушка логгера
type FakeLogger struct{}

func (FakeLogger) Debug(msg interface{}, args ...interface{}) {}
func (FakeLogger) Info(msg string, args ...interface{})       {}
func (FakeLogger) Warn(msg string, args ...interface{})       {}
func (FakeLogger) Error(msg interface{}, args ...interface{}) {}
func (FakeLogger) Fatal(msg interface{}, args ...interface{}) {}
