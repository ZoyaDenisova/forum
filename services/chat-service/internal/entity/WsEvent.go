package entity

type WSAction string

const (
	ActionCreated WSAction = "created"
	ActionUpdated WSAction = "updated"
	ActionDeleted WSAction = "deleted"
)

type WSEvent struct {
	Action    WSAction `json:"action"`               // created / updated / deleted
	Message   *Message `json:"message,omitempty"`    // для created / updated
	MessageID int64    `json:"message_id,omitempty"` // для deleted
}
