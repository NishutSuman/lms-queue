import React from "react";
import { Modal, Table, Tag, Collapse, Alert } from "antd";
import { ExclamationCircleOutlined, CheckCircleOutlined, WarningOutlined } from "@ant-design/icons";

const { Panel } = Collapse;

/**
 * ValidationModal - Displays validation errors before data upload
 *
 * Props:
 * - open: boolean - Modal visibility
 * - onClose: function - Close handler
 * - validationData: object - Validation result from backend
 */
const ValidationModal = ({ open, onClose, validationData }) => {
  if (!validationData) return null;

  const { totalRows, validRows, invalidRows, duplicateTitles } = validationData;
  const hasErrors = invalidRows?.length > 0 || duplicateTitles?.length > 0;

  // Columns for invalid rows table
  const invalidRowsColumns = [
    {
      title: "Row #",
      dataIndex: "rowIndex",
      key: "rowIndex",
      width: 80,
      render: (rowIndex) => (
        <Tag color="red">Row {rowIndex}</Tag>
      ),
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 250,
      render: (title) => title || <span style={{ color: "#999" }}>Untitled</span>,
    },
    {
      title: "Errors",
      dataIndex: "errors",
      key: "errors",
      render: (errors) => (
        <div>
          {errors.map((error, idx) => (
            <div key={idx} style={{ marginBottom: "4px" }}>
              <ExclamationCircleOutlined style={{ color: "#ff4d4f", marginRight: "6px" }} />
              <span>{error}</span>
            </div>
          ))}
        </div>
      ),
    },
  ];

  // Columns for duplicate titles table
  const duplicatesColumns = [
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 300,
    },
    {
      title: "Row Numbers",
      dataIndex: "rows",
      key: "rows",
      render: (rows) => (
        <div>
          {rows.map((rowNum) => (
            <Tag key={rowNum} color="orange" style={{ marginBottom: "4px" }}>
              Row {rowNum}
            </Tag>
          ))}
        </div>
      ),
    },
    {
      title: "Count",
      dataIndex: "count",
      key: "count",
      width: 80,
      render: (count) => <Tag color="orange">{count}x</Tag>,
    },
  ];

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {hasErrors ? (
            <>
              <ExclamationCircleOutlined style={{ color: "#ff4d4f", fontSize: "20px" }} />
              <span>Data Validation Failed</span>
            </>
          ) : (
            <>
              <CheckCircleOutlined style={{ color: "#52c41a", fontSize: "20px" }} />
              <span>Data Validation Passed</span>
            </>
          )}
        </div>
      }
      open={open}
      onCancel={onClose}
      width={900}
      footer={null}
      centered
    >
      {/* Summary */}
      <div style={{ marginBottom: "20px" }}>
        <Alert
          message="Validation Summary"
          description={
            <div>
              <p>
                <strong>Total Rows:</strong> {totalRows} |{" "}
                <strong style={{ color: "#52c41a" }}>Valid:</strong> {validRows} |{" "}
                <strong style={{ color: "#ff4d4f" }}>Invalid:</strong> {invalidRows?.length || 0}
              </p>
              {hasErrors && (
                <p style={{ marginTop: "8px", color: "#ff4d4f" }}>
                  Please fix the errors below and upload again.
                </p>
              )}
            </div>
          }
          type={hasErrors ? "error" : "success"}
          showIcon
        />
      </div>

      {/* Invalid Rows Section */}
      {invalidRows && invalidRows.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <Collapse defaultActiveKey={["1"]} bordered={false}>
            <Panel
              header={
                <span>
                  <WarningOutlined style={{ color: "#ff4d4f", marginRight: "8px" }} />
                  <strong>Invalid Rows ({invalidRows.length})</strong>
                </span>
              }
              key="1"
            >
              <Table
                columns={invalidRowsColumns}
                dataSource={invalidRows.map((row, idx) => ({
                  ...row,
                  key: idx,
                }))}
                pagination={false}
                size="small"
                scroll={{ y: 300 }}
                bordered
              />
            </Panel>
          </Collapse>
        </div>
      )}

      {/* Duplicate Titles Section */}
      {duplicateTitles && duplicateTitles.length > 0 && (
        <div style={{ marginBottom: "20px" }}>
          <Collapse defaultActiveKey={["2"]} bordered={false}>
            <Panel
              header={
                <span>
                  <WarningOutlined style={{ color: "#ff4d4f", marginRight: "8px" }} />
                  <strong>Duplicate Titles ({duplicateTitles.length})</strong>
                </span>
              }
              key="2"
            >
              <Alert
                message="Duplicate titles detected"
                description="Multiple rows have the same title. Each assignment/lecture should have a unique title."
                type="warning"
                showIcon
                style={{ marginBottom: "12px" }}
              />
              <Table
                columns={duplicatesColumns}
                dataSource={duplicateTitles.map((dup, idx) => ({
                  ...dup,
                  key: idx,
                }))}
                pagination={false}
                size="small"
                bordered
              />
            </Panel>
          </Collapse>
        </div>
      )}

      {/* Success Message */}
      {!hasErrors && (
        <Alert
          message="All data is valid!"
          description="Your data passed all validation checks. You can proceed with the upload."
          type="success"
          showIcon
        />
      )}
    </Modal>
  );
};

export default ValidationModal;
