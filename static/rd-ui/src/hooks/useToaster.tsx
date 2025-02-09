// src/hooks/useToaster.ts
import { useEffect, useCallback, useContext } from "react";
import { AlertCommandType } from "../types/AlertToasts";
import { AlertContext } from "../contexts/alert";
import { useNavigate } from "react-router-dom";

export const useToaster = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("alertContext must be used within an AlertProvider");
  }
  const { alertState, clearAlert, setAlertState } = context;
  const navigate = useNavigate();

  useEffect(() => {
    // Handle side-effects related to alertState changes here
    // For example, automatically clear alerts after a timeout
  }, [alertState]);

  const handleFunc = useCallback(() => {
    if (alertState?.callback) {
      switch (alertState.callback.type) {
        case AlertCommandType.subscribe:
          navigate('/subscribe');
          break;
        default:
          break;
      }
    }
  }, [alertState]);

  return { alertState, clearAlert, handleFunc, setAlertState };
};
