import React, { useEffect, useState } from "react";
import { Table, Spin, message, Button, Input, Select, Space, Tag } from "antd";
import { SearchOutlined, DownloadOutlined, ReloadOutlined } from "@ant-design/icons";

const { Option } = Select;

const DataTable = ({ type, refreshKey, setTotalItems }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [batchFilter, setBatchFilter] = useState("all");
  const [sectionFilter, setSectionFilter] = useState("all");

  const isTrue = (val) => {
    if (val === undefined || val === null) return false;
    const v = val.toString().toLowerCase();
    return v === "true" || v === "yes";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      message.loading({ content: "Fetching data...", key: "fetch" });

      const res = await fetch(
        `${apiUrl.replace(/\/+$/, "")}/api/get-automation-status?type=${type}`
      );
      if (!res.ok) {
        setTotalItems(0);
        throw new Error("Failed to fetch");
      }

      const result = await res.json();
      console.log("🚀 Backend result:", result);
      setTotalItems(result.total);

      const items = result.data || [];

      const formatted = items.map((item, index) => ({
        key: index + 1,
        redisId: item.redisKey,
        rowIndex: item.rowIndex || "N/A",
        title: item.title || "N/A",
        batch: item.batch || "N/A",
        section: item.section || "N/A",

        // Assignment specific fields
        type: item.type || "N/A",
        category: item.category || "N/A",
        tags: item.tags || "N/A",
        platforms: item.platforms || "N/A",
        assess_client: item.assess_client || "N/A",
        assessment_template_name: item.assessment_template_name || "N/A",
        previous_assessment_templateName: item.previous_assessment_templateName || "N/A",
        associated_lecture: item.associated_lecture || "N/A",
        startDate: item.startDate || "N/A",
        startTime: item.startTime || "N/A",
        endDate: item.endDate || "N/A",
        endTime: item.endTime || "N/A",
        showScore: item.showScore || "N/A",

        // Lecture specific fields
        host_name: item.host_name || "N/A",
        zoom_link: item.zoom_link || "N/A",
        notes: item.notes || "N/A",

        // Status fields
        assessmentClone: item.isCloned,
        assignmentCreated: item.isAssignmentCreated,
        notesUpdated: item.isNotesUpdated,
        lectureCreated: item.isLectureCreated,

        // Flags
        assessmentCloneFlag: isTrue(item.isCloned),
        assignmentCreatedFlag: isTrue(item.isAssignmentCreated),
        notesUpdatedFlag: isTrue(item.isNotesUpdated),
        lectureCreatedFlag: isTrue(item.isLectureCreated),

        // Error messages
        assessmentCloneError: item.assessmentCloneError || "",
        assignmentCreationError: item.assignmentCreationError || "",
        notesUpdateError: item.notesUpdateError || "",
        lectureCreationError: item.lectureCreationError || "",

        // Metadata
        uploadedAt: item.uploadedAt || "N/A",
        lastUpdated: item.lastUpdated || "N/A",
      }));

      setData(formatted);
      setFilteredData(formatted);

      message.success({ content: "Data loaded successfully", key: "fetch" });
    } catch (err) {
      console.error(err);
      message.error({ content: "Failed to load data", key: "fetch" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey, type]);

  // Apply filters
  useEffect(() => {
    let filtered = [...data];

    // Search filter
    if (searchText) {
      filtered = filtered.filter((item) =>
        Object.values(item).some((val) =>
          String(val).toLowerCase().includes(searchText.toLowerCase())
        )
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      if (type === "assignments") {
        if (statusFilter === "cloned") {
          filtered = filtered.filter((item) => item.assessmentCloneFlag);
        } else if (statusFilter === "created") {
          filtered = filtered.filter((item) => item.assignmentCreatedFlag);
        } else if (statusFilter === "notes") {
          filtered = filtered.filter((item) => item.notesUpdatedFlag);
        } else if (statusFilter === "pending") {
          filtered = filtered.filter(
            (item) =>
              !item.assessmentCloneFlag ||
              !item.assignmentCreatedFlag ||
              !item.notesUpdatedFlag
          );
        }
      } else {
        if (statusFilter === "created") {
          filtered = filtered.filter((item) => item.lectureCreatedFlag);
        } else if (statusFilter === "pending") {
          filtered = filtered.filter((item) => !item.lectureCreatedFlag);
        }
      }
    }

    // Batch filter
    if (batchFilter !== "all") {
      filtered = filtered.filter((item) => item.batch === batchFilter);
    }

    // Section filter
    if (sectionFilter !== "all") {
      filtered = filtered.filter((item) => item.section === sectionFilter);
    }

    setFilteredData(filtered);
  }, [searchText, statusFilter, batchFilter, sectionFilter, data, type]);

  // Get unique batches and sections for filters
  const uniqueBatches = [...new Set(data.map((item) => item.batch))].filter(
    (b) => b !== "N/A"
  );
  const uniqueSections = [...new Set(data.map((item) => item.section))].filter(
    (s) => s !== "N/A"
  );

  // Toggle handler
  const handleToggle = async (record, field) => {
    console.log("🚀 ~ handleToggle ~ record:", record);

    const backendField = field;

    const updatedData = data.map((row) =>
      row.key === record.key
        ? { ...row, [`${field}`]: "true", [`${field}Flag`]: true }
        : row
    );
    setData(updatedData);

    try {
      const res = await fetch(
        `${apiUrl.replace(/\/+$/, "")}/api/update-automation-status?type=${type}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            redisId: record.redisId,
            title: record.title,
            field: backendField,
            newValue: "yes",
          }),
        }
      );

      if (!res.ok) throw new Error("Update failed");
      message.success(`${field} marked true`);
    } catch (error) {
      message.error("Backend update failed");
      console.error(error);
    }
  };

  // Export to CSV
  const exportToCSV = () => {
    if (filteredData.length === 0) {
      message.warning("No data to export");
      return;
    }

    const headers = Object.keys(filteredData[0] || {});
    const csvContent = [
      headers.join(","),
      ...filteredData.map((row) =>
        headers.map((header) => `"${row[header] || ""}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-export-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    message.success("Exported to CSV");
  };

  // Column definitions
  const baseColumns = [
    {
      title: "Row #",
      dataIndex: "rowIndex",
      key: "rowIndex",
      width: 80,
      fixed: "left",
    },
    {
      title: "Title",
      dataIndex: "title",
      key: "title",
      width: 250,
      fixed: "left",
    },
    {
      title: "Batch",
      dataIndex: "batch",
      key: "batch",
      width: 150,
    },
    {
      title: "Section",
      dataIndex: "section",
      key: "section",
      width: 150,
    },
  ];

  // Assignment-specific columns
  const assignmentExtraColumns = [
    {
      title: "Template Name",
      dataIndex: "assessment_template_name",
      key: "assessment_template_name",
      width: 220,
    },
    {
      title: "Previous Template",
      dataIndex: "previous_assessment_templateName",
      key: "previous_assessment_templateName",
      width: 220,
    },
    {
      title: "Associated Lecture",
      dataIndex: "associated_lecture",
      key: "associated_lecture",
      width: 200,
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      width: 120,
    },
    {
      title: "Start Time",
      dataIndex: "startTime",
      key: "startTime",
      width: 120,
    },
    {
      title: "End Date",
      dataIndex: "endDate",
      key: "endDate",
      width: 120,
    },
    {
      title: "End Time",
      dataIndex: "endTime",
      key: "endTime",
      width: 120,
    },
    {
      title: "Show Score",
      dataIndex: "showScore",
      key: "showScore",
      width: 100,
      render: (val) => (val === "yes" ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>),
    },
  ];

  // Lecture-specific columns
  const lectureExtraColumns = [
    {
      title: "Host Name",
      dataIndex: "host_name",
      key: "host_name",
      width: 150,
    },
    {
      title: "Zoom Link",
      dataIndex: "zoom_link",
      key: "zoom_link",
      width: 200,
      render: (link) =>
        link && link !== "N/A" ? (
          <a href={link} target="_blank" rel="noopener noreferrer">
            Open Link
          </a>
        ) : (
          "N/A"
        ),
    },
    {
      title: "Associated Lecture",
      dataIndex: "associated_lecture",
      key: "associated_lecture",
      width: 200,
    },
    {
      title: "Start Date",
      dataIndex: "startDate",
      key: "startDate",
      width: 120,
    },
    {
      title: "Start Time",
      dataIndex: "startTime",
      key: "startTime",
      width: 120,
    },
  ];

  // Status columns
  const assignmentStatusColumns = [
    {
      title: "Assessment Clone",
      dataIndex: "assessmentClone",
      key: "assessmentClone",
      width: 150,
      fixed: "right",
      render: (_, record) =>
        renderToggleCell(record, "assessmentClone", record.assessmentCloneFlag),
    },
    {
      title: "Assignment Created",
      dataIndex: "assignmentCreated",
      key: "assignmentCreated",
      width: 170,
      fixed: "right",
      render: (_, record) =>
        renderToggleCell(record, "assignmentCreated", record.assignmentCreatedFlag),
    },
    {
      title: "Notes Updated",
      dataIndex: "notesUpdated",
      key: "notesUpdated",
      width: 150,
      fixed: "right",
      render: (_, record) =>
        renderToggleCell(record, "notesUpdated", record.notesUpdatedFlag),
    },
  ];

  const lectureStatusColumns = [
    {
      title: "Lecture Created",
      dataIndex: "lectureCreated",
      key: "lectureCreated",
      width: 150,
      fixed: "right",
      render: (_, record) =>
        renderToggleCell(record, "lectureCreated", record.lectureCreatedFlag),
    },
  ];

  // UI cell renderer
  const renderToggleCell = (record, field, flag) => {
    // Get the error field name
    const errorFieldMap = {
      assessmentClone: 'assessmentCloneError',
      assignmentCreated: 'assignmentCreationError',
      notesUpdated: 'notesUpdateError',
      lectureCreated: 'lectureCreationError'
    };
    const errorField = errorFieldMap[field];
    const errorMessage = record[errorField];

    return (
      <div
        style={{
          backgroundColor: flag ? "#e8f5e9" : errorMessage ? "#fff3cd" : "#fde2e2",
          padding: "5px",
          borderRadius: "4px",
          textAlign: "center",
        }}
      >
        {flag ? (
          "true"
        ) : errorMessage ? (
          <div style={{ color: "#856404" }}>
            <div style={{ fontWeight: "bold", marginBottom: "4px" }}>Error</div>
            <div style={{ fontSize: "12px", whiteSpace: "pre-wrap", textAlign: "left" }}>
              {errorMessage}
            </div>
          </div>
        ) : (
          <Button
            size="small"
            type="dashed"
            onClick={() => handleToggle(record, field)}
          >
            Mark True
          </Button>
        )}
      </div>
    );
  };

  // Final columns
  const columns =
    type === "assignments"
      ? [...baseColumns, ...assignmentExtraColumns, ...assignmentStatusColumns]
      : [...baseColumns, ...lectureExtraColumns, ...lectureStatusColumns];

  return (
    <div className="p-6 bg-white shadow-sm rounded-lg">
      {/* Search and Filter Section */}
      <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <Input
              placeholder="Search anything..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
              allowClear
            />

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 180 }}
            >
              <Option value="all">All Status</Option>
              {type === "assignments" ? (
                <>
                  <Option value="cloned">✅ Cloned</Option>
                  <Option value="created">✅ Created</Option>
                  <Option value="notes">✅ Notes Updated</Option>
                  <Option value="pending">⏳ Pending</Option>
                </>
              ) : (
                <>
                  <Option value="created">✅ Created</Option>
                  <Option value="pending">⏳ Pending</Option>
                </>
              )}
            </Select>

            {/* Batch Filter */}
            <Select
              value={batchFilter}
              onChange={setBatchFilter}
              style={{ width: 200 }}
            >
              <Option value="all">All Batches</Option>
              {uniqueBatches.map((batch) => (
                <Option key={batch} value={batch}>
                  {batch}
                </Option>
              ))}
            </Select>

            {/* Section Filter */}
            <Select
              value={sectionFilter}
              onChange={setSectionFilter}
              style={{ width: 200 }}
            >
              <Option value="all">All Sections</Option>
              {uniqueSections.map((section) => (
                <Option key={section} value={section}>
                  {section}
                </Option>
              ))}
            </Select>

            {/* Actions */}
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchData}
              loading={loading}
            >
              Refresh
            </Button>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={exportToCSV}
              disabled={filteredData.length === 0}
            >
              Export CSV
            </Button>
          </div>

          {/* Results info */}
          <div className="text-sm text-gray-600">
            Showing <strong>{filteredData.length}</strong> of <strong>{data.length}</strong> items
            {searchText && <span className="text-blue-600"> | Search: "{searchText}"</span>}
          </div>
        </Space>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredData}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total) => `Total ${total} items`
          }}
          bordered
          scroll={{ x: 1800 }}
          size="small"
        />
      )}
    </div>
  );
};

export default DataTable;
