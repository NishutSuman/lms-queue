import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import ActionButtons from "../components/ActionButtons";
import DataTable from "../components/DataTable";

const Dashboard = () => {
  const [params] = useSearchParams();
  const [totalItems, setTotalItems]=useState(0)
  const type = params.get("type"); 
  const navigate = useNavigate();

  useEffect(() => {
    if (type !== "assignments" && type !== "lectures") {
      console.log("Invalid type. Redirecting...");
      navigate("/");
    }
  }, [type, navigate]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingAction, setLoadingAction] = useState("");

  const refreshTable = () => setRefreshKey((p) => p + 1);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">
          {type === "assignments" ? "Assignments" : "Lectures"} Automation
        </h1>
        <div className="text-sm text-gray-500">
          Total {type}: <span className="font-medium">{totalItems}</span>
        </div>
      </div>

      <ActionButtons
        type={type}
        onRefresh={refreshTable}
        loadingAction={loadingAction}
        setLoadingAction={setLoadingAction}
      />

      <DataTable key={refreshKey} type={type} refreshKey={refreshKey} setTotalItems={setTotalItems} />
    </div>
  );
};

export default Dashboard;