import React, { useEffect, useState } from "react";
import { Table, Spin, message, Button } from "antd";

const DataTable = ({ type, refreshKey, setTotalItems }) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  const isTrue = (val) => {
    if (val === undefined || val === null) return false;
    const v = val.toString().toLowerCase();
    return v === "true" || v === "yes";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        message.loading({ content: "Fetching data...", key: "fetch" });

        const res = await fetch(
          `${apiUrl.replace(/\/+$/, "")}/api/get-automation-status?type=${type}`
        );
        if (!res.ok){ 
          setTotalItems(0)
          throw new Error("Failed to fetch");
        }

        const result = await res.json();
        console.log("🚀 Backend result:", result);
        setTotalItems(result.total)

        const items = result.data || [];

        const formatted = items.map((item, index) => ({
          key: index + 1,
          redisId: item.redisKey,
          title: item.title || "N/A",
          batch: item.batch || "N/A",
          section: item.section || "N/A",

          // only for assignments
          assessmentClone: item.isCloned,
          assignmentCreated: item.isAssignmentCreated,
          notesUpdated: item.isNotesUpdated,

          // only for lectures
          lectureCreated: item.isLectureCreated,

          // flags
          assessmentCloneFlag: isTrue(item.isCloned),
          assignmentCreatedFlag: isTrue(item.isAssignmentCreated),
          notesUpdatedFlag: isTrue(item.isNotesUpdated),
          lectureCreatedFlag: isTrue(item.isLectureCreated),
        }));

        setData(formatted);

        message.success({ content: "Data loaded successfully", key: "fetch" });
      } catch (err) {
        console.error(err);
        message.error({ content: "Failed to load data", key: "fetch" });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [refreshKey, type]);

  // 🟢 For toggling backend values
  const handleToggle = async (record, field) => {
    console.log("🚀 ~ handleToggle ~ record:", record)
    
    const backendField = field; // already correct keys

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

  // 🟦 Common Columns
  const baseColumns = [
    { title: "Title", dataIndex: "title", key: "title" },
    { title: "Batch", dataIndex: "batch", key: "batch" },
    { title: "Section", dataIndex: "section", key: "section" },
  ];

  // 🟧 Assignments Extra Columns
  const assignmentColumns = [
    {
      title: "Assessment Clone",
      dataIndex: "assessmentClone",
      key: "assessmentClone",
      filters: [
        { text: "yes", value: "true" },
        { text: "no", value: "false" },
      ],
      onFilter: (value, record) =>
        value === "true"
          ? record.assessmentCloneFlag
          : !record.assessmentCloneFlag,
      render: (_, record) =>
        renderToggleCell(record, "assessmentClone", record.assessmentCloneFlag),
    },

    {
      title: "Assignment Created",
      dataIndex: "assignmentCreated",
      key: "assignmentCreated",
      filters: [
        { text: "yes", value: "true" },
        { text: "no", value: "false" },
      ],
      onFilter: (value, record) =>
        value === "true"
          ? record.assignmentCreatedFlag
          : !record.assignmentCreatedFlag,
      render: (_, record) =>
        renderToggleCell(
          record,
          "assignmentCreated",
          record.assignmentCreatedFlag
        ),
    },

    {
      title: "Notes Updated",
      dataIndex: "notesUpdated",
      key: "notesUpdated",
      filters: [
        { text: "yes", value: "true" },
        { text: "no", value: "false" },
      ],
      onFilter: (value, record) =>
        value === "true"
          ? record.notesUpdatedFlag
          : !record.notesUpdatedFlag,
      render: (_, record) =>
        renderToggleCell(record, "notesUpdated", record.notesUpdatedFlag),
    },
  ];

  // 🟩 Lecture Extra Column (ONLY ONE)
  const lectureColumns = [
    {
      title: "Lecture Created",
      dataIndex: "lectureCreated",
      key: "lectureCreated",
      filters: [
        { text: "yes", value: "true" },
        { text: "no", value: "false" },
      ],
      onFilter: (value, record) =>
        value === "true"
          ? record.lectureCreatedFlag
          : !record.lectureCreatedFlag,
      render: (_, record) =>
        renderToggleCell(record, "lectureCreated", record.lectureCreatedFlag),
    },
  ];

  // 🔵 UI cell renderer (same style as your old component)
  const renderToggleCell = (record, field, flag) => (
    <div
      style={{
        backgroundColor: flag ? "#e8f5e9" : "#fde2e2",
        padding: "5px",
        borderRadius: "4px",
        textAlign: "center",
      }}
    >
      {flag ? (
        "true"
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

  // 📌 Final column selection based on type
  const columns =
    type === "assignments"
      ? [...baseColumns, ...assignmentColumns]
      : [...baseColumns, ...lectureColumns];

  return (
    <div className="p-6 bg-white shadow-sm rounded-lg">
      {loading ? (
        <div className="flex justify-center items-center h-48">
          <Spin size="large" />
        </div>
      ) : (
        <Table
          columns={columns}
          dataSource={data}
          pagination={{ pageSize: 10 }}
          bordered
        />
      )}
    </div>
  );
};

export default DataTable;