import React from "react";
import { Tabs, Table, Tag, Tooltip } from "antd";

const RESOURCE = [
  { key: "lecture_note", label: "Lecture Notes" },
  { key: "assignment", label: "Assignments" },
  { key: "solution_video", label: "Solution Videos" },
];
const STATUS_COLOR = {
  pending: "default", in_progress: "processing", done: "success", failed: "error", skipped: "warning",
};

// Full, sheet-like view of generated items, split into a tab per resource type.
// showStatus adds the live status column (for committed runs).
export default function ItemsTabs({ items = [], showStatus = false }) {
  const columnsFor = (type) => {
    const idTitle =
      type === "assignment" ? "Assignment ID" : type === "solution_video" ? "Video ID" : "Lecture ID";
    const cols = [
      { title: "Session", dataIndex: "session_title", ellipsis: true, width: 200 },
      { title: idTitle, dataIndex: "source_id", width: 100 },
      { title: "Source Title", dataIndex: "source_title", ellipsis: true, width: 240 },
      { title: "Batch", dataIndex: "target_batch", ellipsis: true, width: 170 },
      { title: "Section", dataIndex: "target_section", ellipsis: true, width: 180 },
      { title: "Assoc. Lecture", dataIndex: "associated_lecture", ellipsis: true, width: 200 },
      { title: "Start", render: (_, r) => `${r.start_date} ${r.start_time}`, width: 150 },
      { title: "End", render: (_, r) => `${r.end_date} ${r.end_time}`, width: 150 },
    ];
    if (type === "assignment") {
      cols.push({
        title: "Actual Start",
        render: (_, r) => `${r.actual_start_date || ""} ${r.actual_start_time || ""}`.trim(),
        width: 150,
      });
    }
    if (showStatus) {
      cols.push({
        title: "Status", dataIndex: "status", width: 120, fixed: "right",
        filters: Object.keys(STATUS_COLOR).map((s) => ({ text: s, value: s })),
        onFilter: (v, r) => r.status === v,
        render: (s, r) =>
          r.error
            ? <Tooltip title={r.error}><Tag color={STATUS_COLOR[s]}>{s} ⚠</Tag></Tooltip>
            : <Tag color={STATUS_COLOR[s]}>{s}</Tag>,
      });
    }
    return cols;
  };

  const tabItems = RESOURCE.map(({ key, label }) => {
    const data = items.filter((i) => i.resource_type === key);
    return {
      key,
      label: `${label} (${data.length})`,
      children: (
        <Table
          rowKey={(r) => r.id ?? `${r.resource_type}-${r.target_section}-${r.session_title}`}
          size="small"
          columns={columnsFor(key)}
          dataSource={data}
          pagination={{ pageSize: 15, showSizeChanger: true }}
          scroll={{ x: 1300 }}
        />
      ),
    };
  });

  return <Tabs items={tabItems} />;
}
