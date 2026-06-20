import React from "react";
import { Modal, Typography, Alert } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

const { Title, Paragraph } = Typography;

const ErrorModal = ({ open, onClose, errorData }) => {
  if (!errorData) return null;

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      <div style={{ padding: "10px 0" }}>
        <div style={{ display: "flex", alignItems: "center", marginBottom: "20px" }}>
          <ExclamationCircleOutlined
            style={{
              fontSize: "32px",
              color: "#faad14",
              marginRight: "12px",
            }}
          />
          <Title level={4} style={{ margin: 0 }}>
            Error Details
          </Title>
        </div>

        <Alert
          message="Task Failed"
          description={
            <div>
              <Paragraph strong style={{ marginTop: "10px", marginBottom: "8px" }}>
                Row: {errorData.rowIndex}
              </Paragraph>
              <Paragraph strong style={{ marginBottom: "8px" }}>
                Title: {errorData.title}
              </Paragraph>
              <Paragraph strong style={{ marginBottom: "15px" }}>
                Task: {errorData.taskName}
              </Paragraph>

              {/* Parse structured error message */}
              {(() => {
                const msg = errorData.errorMessage;
                const lines = msg.split('\n');

                // Check if it's structured format (Field, Value, Reason)
                if (msg.includes('Failed at field:')) {
                  const field = lines[0]?.replace('Failed at field:', '').replace(/"/g, '').trim();
                  const value = lines[1]?.replace('Value:', '').replace(/"/g, '').trim();
                  const reason = lines[2]?.replace('Reason:', '').trim();

                  return (
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "15px",
                        backgroundColor: "#fff7e6",
                        borderRadius: "6px",
                        border: "1px solid #ffd591",
                      }}
                    >
                      <div style={{ marginBottom: "12px" }}>
                        <strong style={{ color: "#ad6800", fontSize: "13px" }}>Failed Field:</strong>
                        <div style={{ color: "#d46b08", fontSize: "14px", marginTop: "4px", fontWeight: "500" }}>
                          {field}
                        </div>
                      </div>

                      <div style={{ marginBottom: "12px" }}>
                        <strong style={{ color: "#ad6800", fontSize: "13px" }}>Value Provided:</strong>
                        <div style={{ color: "#d46b08", fontSize: "14px", marginTop: "4px", fontWeight: "500" }}>
                          {value}
                        </div>
                      </div>

                      <div>
                        <strong style={{ color: "#ad6800", fontSize: "13px" }}>Reason:</strong>
                        <div style={{ color: "#ad6800", fontSize: "14px", marginTop: "4px", lineHeight: "1.6" }}>
                          {reason}
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // Fallback for unstructured errors
                  return (
                    <div
                      style={{
                        marginTop: "15px",
                        padding: "12px",
                        backgroundColor: "#fff7e6",
                        borderRadius: "4px",
                        border: "1px solid #ffd591",
                      }}
                    >
                      <Paragraph
                        style={{
                          margin: 0,
                          color: "#ad6800",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-word",
                        }}
                      >
                        {msg}
                      </Paragraph>
                    </div>
                  );
                }
              })()}
            </div>
          }
          type="warning"
          showIcon
        />
      </div>
    </Modal>
  );
};

export default ErrorModal;
