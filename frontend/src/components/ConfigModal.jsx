import { Modal, Input, Button } from "antd";
import { useEffect, useState } from "react";
import { EyeOutlined, EyeInvisibleOutlined } from "@ant-design/icons";


export default function ConfigModal({ open, onClose }) {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [form, setForm] = useState({
    MASAI_ADMIN_LMS_USER_EMAIL: "",
    MASAI_ADMIN_LMS_USER_PASSWORD: "",
    MASAI_ASSESS_PLATFORM_USER_EMAIL: "",
    MASAI_ASSESS_PLATFORM_USER_PASSWORD: "",
    GOOGLE_SHEET_ID: "",
  });

  const requiredKeys = [
    "MASAI_ADMIN_LMS_USER_EMAIL",
    "MASAI_ADMIN_LMS_USER_PASSWORD",
    "MASAI_ASSESS_PLATFORM_USER_EMAIL",
    "MASAI_ASSESS_PLATFORM_USER_PASSWORD",
    "GOOGLE_SHEET_ID",
  ];

  const [showPassword, setShowPassword] = useState({
    MASAI_ADMIN_LMS_USER_PASSWORD: false,
    MASAI_ASSESS_PLATFORM_USER_PASSWORD: false,
  });

  const toggleShow = (key) => {
    setShowPassword((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;

    const fetchConfig = async () => {
      try {
        setFetching(true);
        const res = await fetch(`${apiUrl}/config/read`);
        const data = await res.json();
        const filteredData = {};
        requiredKeys.forEach((key) => (filteredData[key] = data[key] || ""));
        setForm(filteredData);
      } catch (e) {
        console.log("Failed to load config", e);
      } finally {
        setFetching(false);
      }
    };

    fetchConfig();
  }, [open]);

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
    const emptyField = Object.values(form).some((v) => v.trim() === "");
    if (emptyField) return setError("❌ All fields are required!");

    try {
      setLoading(true);
      const res = await fetch(`${apiUrl}/config/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (!res.ok) return setError("❌ Failed: " + data.message);

      alert("✅ Saved successfully!");
      onClose();
    } catch (err) {
      setError("❌ Failed to save changes");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = async () => {
    await fetch(`${apiUrl}/config/reset`, { method: "POST" });
    alert("♻️ Config reset");
  };

  return (
    <Modal
      title="Configuration"
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="reset" onClick={handleReset} danger>
          Reset
        </Button>,
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="save"
          type="primary"
          onClick={handleSubmit}
          loading={loading}
        >
          Save
        </Button>,
      ]}
    >
      {error && <p className="text-red-600 mb-3">{error}</p>}

      {fetching ? (
        <p>Loading...</p>
      ) : (
        <>
          {Object.keys(form).map((key) => {
            const isPassword = key.toLowerCase().includes("password");
            const show = showPassword[key];

            return (
              <div key={key} className="mb-3">
                <label className="block text-sm font-medium mb-1">{key}</label>
                <div style={{ position: "relative" }}>
                  <Input
                    type={isPassword && !show ? "password" : "text"}
                    name={key}
                    value={form[key]}
                    onChange={handleChange}
                    style={{ paddingRight: "40px" }}
                  />

                  {isPassword && (
                    <span
                      onClick={() => toggleShow(key)}
                      style={{
                        position: "absolute",
                        right: "10px",
                        top: "50%",
                        transform: "translateY(-50%)",
                        cursor: "pointer",
                        color: "#555",
                        fontSize: "16px",
                      }}
                    >
                      {show ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </>
      )}
    </Modal>
  );
}