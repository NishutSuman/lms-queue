import { useState } from "react";
import { Button, message } from "antd";
import ValidationModal from "./ValidationModal";
import ProgressModal from "./ProgressModal";

const ActionButtons = ({
  type,
  onRefresh,
  loadingAction,
  setLoadingAction,
}) => {
  const apiUrl = import.meta.env.VITE_API_URL;
  const [validationModalOpen, setValidationModalOpen] = useState(false);
  const [validationData, setValidationData] = useState(null);
  const [progressModalOpen, setProgressModalOpen] = useState(false);
  const [progressSessionId, setProgressSessionId] = useState(null);
  const [progressTaskType, setProgressTaskType] = useState("");
  const [progressTotal, setProgressTotal] = useState(0);
  const [hasActiveProgress, setHasActiveProgress] = useState(false);

  // Build endpoint: ensure no double slashes
  const buildUrl = (path) => `${apiUrl.replace(/\/+$/, "")}/api${path}?type=${type}`;
  

  const handleApiRequest = async (url, actionName, method = "POST") => {
    try {
      setLoadingAction(actionName);
      message.loading({
        content: `${actionName} in progress...`,
        key: actionName,
      });

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        // Try to parse validation errors from response
        try {
          const errorData = await response.json();

          // Check if this is a validation error
          if (errorData.validation && actionName === "Upload data from CSV") {
            message.destroy(actionName);
            setValidationData(errorData.validation);
            setValidationModalOpen(true);
            return; // Don't throw error, show modal instead
          }
        } catch (parseErr) {
          // If parsing fails, fall through to generic error
        }

        const errText = await response.text().catch(() => "");
        throw new Error(
          `Request failed with status ${response.status} ${errText}`
        );
      }

      const data = await response.json().catch(() => ({}));
      console.log("🚀 ~ handleApiRequest ~ data:", data)

      // Check if response contains sessionId (indicates live progress available)
      if (data.sessionId) {
        message.destroy(actionName);
        message.info({
          content: "Opening live progress monitor...",
          key: actionName,
          duration: 2,
        });

        // Open progress modal
        setProgressSessionId(data.sessionId);
        setProgressTaskType(actionName);
        setProgressTotal(data.total || 0);
        setProgressModalOpen(true);
        setHasActiveProgress(true);
      } else {
        message.success({
          content: data.message || `${actionName} completed successfully!`,
          key: actionName,
        });
      }

      onRefresh();
    } catch (error) {
      console.error(`Error during ${actionName}:`, error);
      message.error({
        content: `Failed to ${actionName.toLowerCase()}. Please try again.`,
        key: actionName,
      });
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <div className="flex flex-wrap gap-4 justify-center items-center p-6 bg-white shadow-sm rounded-lg">
      {/* Show Progress Button - Only visible when there's active progress */}
      {hasActiveProgress && !progressModalOpen && (
        <Button
          type="primary"
          ghost
          onClick={() => setProgressModalOpen(true)}
          style={{
            borderColor: "#52c41a",
            color: "#52c41a",
            fontWeight: 500
          }}
        >
          📊 Show Progress
        </Button>
      )}

      <Button
        type="primary"
        loading={loadingAction === "Upload data from CSV"}
        onClick={() =>
          handleApiRequest(
            buildUrl("/add-data"),
            "Upload data from CSV",
            "POST"
          )
        }
      >
        Upload data from CSV
      </Button>

      {/* These buttons are contextual — for assignments we expose clone/create/update-notes */}
      {type === "assignments" && (
        <>
          <Button
            loading={loadingAction === "Clone Assessment Template"}
            onClick={() =>
              handleApiRequest(
                buildUrl("/clone-assessment-template"),
                "Clone Assessment Template",
                "POST"
              )
            }
          >
            Clone Assessment Template
          </Button>

          <Button
            loading={loadingAction === "Create Assignment"}
            onClick={() =>
              handleApiRequest(
                buildUrl("/create-assignments"),
                "Create Assignment",
                "POST"
              )
            }
          >
            Create Assignment
          </Button>
        </>
      )}

      {/* For lectures */}
      {type === "lectures" && (
        <>
          <Button
            loading={loadingAction === "Create Lecture"}
            onClick={() =>
              handleApiRequest(
                buildUrl("/create-lectures"),
                "Create Lecture",
                "POST"
              )
            }
          >
            Create Lecture
          </Button>
        </>
      )}

      {/* For notes */}
      {type === "notes" && (
        <>
          <Button
            type="dashed"
            loading={loadingAction === "Update Notes"}
            onClick={() =>
              handleApiRequest(
                `${apiUrl.replace(/\/+$/, "")}/api/start-update-notes`,
                "Update Notes",
                "POST"
              )
            }
          >
            Update Notes
          </Button>
        </>
      )}

      {/* For clone */}
      {type === "clone" && (
        <>
          <Button
            loading={loadingAction === "Clone Lectures"}
            onClick={() =>
              handleApiRequest(
                `${apiUrl.replace(/\/+$/, "")}/api/start-clone-lectures`,
                "Clone Lectures",
                "POST"
              )
            }
          >
            Clone Lectures
          </Button>
        </>
      )}

      {/* For assignmentClone */}
      {type === "assignmentClone" && (
        <>
          <Button
            loading={loadingAction === "Clone Assignments"}
            onClick={() =>
              handleApiRequest(
                `${apiUrl.replace(/\/+$/, "")}/api/start-clone-assignments`,
                "Clone Assignments",
                "POST"
              )
            }
          >
            Clone Assignments
          </Button>
        </>
      )}

      <Button
        type="primary"
        danger
        loading={loadingAction === "Clear data from CSV"}
        onClick={() =>
          handleApiRequest(
            buildUrl("/cleardata"),
            "Clear data from CSV",
            "DELETE"
          )
        }
      >
        Clear data from CSV
      </Button>

      {/* Validation Modal */}
      <ValidationModal
        open={validationModalOpen}
        onClose={() => setValidationModalOpen(false)}
        validationData={validationData}
      />

      {/* Progress Modal */}
      <ProgressModal
        open={progressModalOpen}
        onMinimize={() => {
          setProgressModalOpen(false);
        }}
        onClose={() => {
          setProgressModalOpen(false);
          setHasActiveProgress(false);
          setProgressTotal(0);
          onRefresh();
        }}
        sessionId={progressSessionId}
        taskType={progressTaskType}
        initialTotal={progressTotal}
      />
    </div>
  );
};

export default ActionButtons;