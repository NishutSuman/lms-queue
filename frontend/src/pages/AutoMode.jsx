import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import {
  Card, DatePicker, Button, Table, Tag, Space, Statistic, Row, Col,
  Typography, Alert, message, Divider, Popconfirm,
} from "antd";
import ItemsTabs from "../components/ItemsTabs";
import LiveTerminal from "../components/LiveTerminal";

const { RangePicker } = DatePicker;
const { Title, Paragraph, Text } = Typography;
const apiUrl = import.meta.env.VITE_API_URL;

const STATUS_COLOR = { pending: "default", in_progress: "processing", done: "success", failed: "error", skipped: "warning", partial: "gold" };
const CATS = [
  { key: "lecture_note", label: "Lecture Notes" },
  { key: "assignment", label: "Assignments" },
  { key: "solution_video", label: "Solution Videos" },
];
const fmtDur = (sec) => {
  if (sec == null || !isFinite(sec)) return "—";
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60), s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
};

export default function AutoMode() {
  const [range, setRange] = useState([dayjs().day(6), dayjs().day(6).add(6, "day")]); // Sat→Fri default
  const [preview, setPreview] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [creating, setCreating] = useState(false);

  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [items, setItems] = useState([]);
  const [executing, setExecuting] = useState(false);
  const [execCat, setExecCat] = useState(null);
  const [showPreview, setShowPreview] = useState(true);
  const [sessionId, setSessionId] = useState(null);
  const [etaAnchor, setEtaAnchor] = useState(null);
  const [, setClock] = useState(0);

  const fmt = (d) => d.format("DD-MM-YYYY");

  const loadRuns = useCallback(async () => {
    try {
      const r = await fetch(`${apiUrl}/db/runs`).then((x) => x.json());
      setRuns(r.runs || []);
    } catch { /* ignore */ }
  }, []);

  const loadItems = useCallback(async (runId) => {
    if (!runId) return;
    try {
      const r = await fetch(`${apiUrl}/db/runs/${runId}/items`).then((x) => x.json());
      setItems(r.items || []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadRuns(); }, [loadRuns]);

  // Poll the selected run's items while anything is still pending/in progress.
  useEffect(() => {
    if (!selectedRun) return;
    loadItems(selectedRun);
    const busy = items.some((i) => i.status === "pending" || i.status === "in_progress");
    if (!busy && !executing) return;
    const t = setInterval(() => { loadItems(selectedRun); loadRuns(); }, 3000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRun, executing, items.length, items.map((i) => i.status).join(",")]);

  // Recompute the ETA anchor whenever items change (avg per finished item × remaining).
  useEffect(() => {
    const finished = items.filter((i) => i.finished_at && i.started_at);
    const avgSec = finished.length
      ? finished.reduce((a, i) => a + (new Date(i.finished_at) - new Date(i.started_at)) / 1000, 0) / finished.length
      : null;
    const remaining = items.filter((i) => i.status === "pending" || i.status === "in_progress").length;
    setEtaAnchor(remaining > 0 ? { etaSec: avgSec != null ? avgSec * remaining : null, avgSec, remaining, at: Date.now() } : null);
  }, [items]);

  // Tick every second so the countdown updates smoothly between polls.
  useEffect(() => {
    if (!etaAnchor) return;
    const t = setInterval(() => setClock((c) => c + 1), 1000);
    return () => clearInterval(t);
  }, [etaAnchor]);

  const doPreview = async () => {
    if (!range?.[0] || !range?.[1]) return message.warning("Pick a date range first");
    setLoadingPreview(true); setPreview(null);
    try {
      const res = await fetch(`${apiUrl}/db/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fmt(range[0]), to: fmt(range[1]), commit: false }),
      }).then((x) => x.json());
      if (res.error) throw new Error(res.error);
      setPreview(res); setShowPreview(true);
    } catch (e) { message.error(e.message || "Preview failed"); }
    finally { setLoadingPreview(false); }
  };

  const createRun = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${apiUrl}/db/generate`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ from: fmt(range[0]), to: fmt(range[1]), commit: true }),
      }).then((x) => x.json());
      if (res.error) throw new Error(res.error);
      message.success(`Run #${res.runId} created with ${res.itemCount} items`);
      setPreview(null);
      await loadRuns();
      setSelectedRun(res.runId);
    } catch (e) { message.error(e.message || "Create run failed"); }
    finally { setCreating(false); }
  };

  const executeRun = async (runId, resourceType = null) => {
    setExecuting(true); setExecCat(resourceType || "all");
    try {
      const res = await fetch(`${apiUrl}/db/runs/${runId}/execute`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resourceType }),
      }).then((x) => x.json());
      if (res.error) throw new Error(res.error);
      if (res.sessionId) setSessionId(res.sessionId);
      message.success(`${resourceType ? resourceType.replace("_", " ") : "All items"} queued — watch live status below`);
      setSelectedRun(runId);
      loadItems(runId);
    } catch (e) { message.error(e.message || "Execute failed"); }
    finally { setExecuting(false); }
  };

  const removeRun = async (runId) => {
    try {
      const res = await fetch(`${apiUrl}/db/runs/${runId}`, { method: "DELETE" }).then((x) => x.json());
      if (res.error) throw new Error(res.error);
      message.success(`Run #${runId} deleted`);
      if (selectedRun === runId) { setSelectedRun(null); setItems([]); }
      loadRuns();
    } catch (e) { message.error(e.message || "Delete failed"); }
  };

  const runColumns = [
    { title: "Run", dataIndex: "id", render: (id) => `#${id}` },
    { title: "Week", dataIndex: "week_label" },
    { title: "Status", dataIndex: "status", render: (s) => <Tag color={STATUS_COLOR[s] || "default"}>{s}</Tag> },
    { title: "Total", dataIndex: "total" },
    { title: "Done", dataIndex: "done", render: (v) => <Text type="success">{v}</Text> },
    { title: "Failed", dataIndex: "failed", render: (v) => (v ? <Text type="danger">{v}</Text> : v) },
    { title: "Pending", dataIndex: "pending" },
    {
      title: "Action",
      render: (_, r) => (
        <Space>
          <Button size="small" type="primary" ghost onClick={() => setSelectedRun(r.id)}>View / Run</Button>
          <Popconfirm title={`Delete run #${r.id} and its items?`} okText="Delete"
            okButtonProps={{ danger: true }} onConfirm={() => removeRun(r.id)}>
            <Button size="small" danger>Delete</Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const s = preview?.stats;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Title level={3} style={{ margin: 0 }}>⚡ Auto Mode</Title>
        <Link to="/"><Button>← Sheet Mode</Button></Link>
      </div>

      <Alert
        type="info" showIcon
        message="Auto mode reads the unified calendar and prepares everything in the database — no manual sheet."
        description="Execution needs the DB worker running: in backend, run  npm run db:worker  (like your other runners)."
      />

      {/* Step 1 — pick a week + preview */}
      <Card title="1 · Pick the week & preview">
        <Space wrap>
          <RangePicker format="DD-MM-YYYY" value={range} onChange={setRange} />
          <Button type="primary" loading={loadingPreview} onClick={doPreview}>Generate Preview</Button>
        </Space>

        {s && (
          <>
            <Divider />
            <Row gutter={16}>
              <Col><Statistic title="Matched sessions" value={s.matchedSessions} /></Col>
              <Col><Statistic title="Items" value={s.itemsGenerated} /></Col>
              <Col><Statistic title="Lecture notes" value={s.byType?.lecture_note || 0} /></Col>
              <Col><Statistic title="Assignments" value={s.byType?.assignment || 0} /></Col>
              <Col><Statistic title="Solution videos" value={s.byType?.solution_video || 0} /></Col>
            </Row>
            <Paragraph type="secondary" style={{ marginTop: 8 }}>
              Schedule — notes {preview.schedule.lecture.startTime}, assignment {preview.schedule.assignment.startTime} → {preview.schedule.assignment.endDate}, solution {preview.schedule.solution.startTime}
            </Paragraph>
            {preview.unmatchedSessions?.length > 0 && (
              <Alert type="warning" showIcon style={{ marginTop: 8 }}
                message={`${preview.unmatchedSessions.length} calendar session(s) with no master mapping (skipped)`}
                description={<div style={{ maxHeight: 120, overflow: "auto" }}>{preview.unmatchedSessions.map((t) => <div key={t}>• {t}</div>)}</div>} />
            )}
            {preview.missingIds?.length > 0 && (
              <Alert type="warning" showIcon style={{ marginTop: 8 }}
                message={`${preview.missingIds.length} matched but missing IDs (resource skipped)`}
                description={<div style={{ maxHeight: 120, overflow: "auto" }}>{preview.missingIds.map((t) => <div key={t}>• {t}</div>)}</div>} />
            )}
            <Button type="primary" style={{ marginTop: 16 }} loading={creating}
              disabled={!s.itemsGenerated} onClick={createRun}>
              Create Run ({s.itemsGenerated} items)
            </Button>
          </>
        )}
      </Card>

      {/* Prepared data — full rows, per type, before committing */}
      {preview?.items?.length > 0 && (
        <Card
          title="Prepared data (preview — not saved yet)"
          extra={
            <Button size="small" onClick={() => setShowPreview((v) => !v)}>
              {showPreview ? "Hide preview" : "Show preview"}
            </Button>
          }
        >
          {showPreview ? (
            <ItemsTabs items={preview.items} />
          ) : (
            <Text type="secondary">Preview hidden ({preview.items.length} rows). Click "Show preview" to expand.</Text>
          )}
        </Card>
      )}

      {/* Step 2 — run history */}
      <Card title="2 · Run History" extra={<Button size="small" onClick={loadRuns}>Refresh</Button>}>
        <Table rowKey="id" size="small" columns={runColumns} dataSource={runs}
          pagination={{ pageSize: 8 }} />
      </Card>

      {/* Step 3 — items of the selected run (live) */}
      {selectedRun && (
        <Card title={`3 · Run #${selectedRun} — run by category & live status`}
          extra={<Button size="small" onClick={() => loadItems(selectedRun)}>Refresh</Button>}>
          {etaAnchor && (
            <Alert style={{ marginBottom: 12 }} type="info" showIcon
              message={etaAnchor.avgSec != null
                ? `⏱ Est. remaining ~${fmtDur(etaAnchor.etaSec - (Date.now() - etaAnchor.at) / 1000)}  ·  avg ${etaAnchor.avgSec.toFixed(1)}s/item  ·  ${etaAnchor.remaining} pending`
                : `⏱ Estimating…  ${etaAnchor.remaining} pending (waiting for the first item to finish)`} />
          )}
          <Space wrap style={{ marginBottom: 12 }}>
            {CATS.map((c) => {
              const pend = items.filter((i) => i.resource_type === c.key && (i.status === "pending" || i.status === "failed")).length;
              return (
                <Button key={c.key} type="primary" ghost disabled={pend === 0}
                  loading={executing && execCat === c.key} onClick={() => executeRun(selectedRun, c.key)}>
                  Run {c.label} ({pend})
                </Button>
              );
            })}
            {(() => {
              const all = items.filter((i) => i.status === "pending" || i.status === "failed").length;
              return (
                <Button type="primary" disabled={all === 0} loading={executing && execCat === "all"}
                  onClick={() => executeRun(selectedRun)}>
                  Run All ({all})
                </Button>
              );
            })()}
          </Space>
          <ItemsTabs items={items} showStatus />
        </Card>
      )}

      {/* Live terminal — streams worker logs while a run executes */}
      {sessionId && (
        <Card
          title="🖥️ Live Terminal"
          extra={<Text type="secondary" style={{ fontSize: 12 }}>{sessionId}</Text>}
        >
          <LiveTerminal sessionId={sessionId} />
        </Card>
      )}
    </div>
  );
}
