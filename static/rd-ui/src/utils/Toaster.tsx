import Alert, { AlertColor } from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Snackbar from "@mui/material/Snackbar";
import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";

import type { TypedUseSelectorHook } from "react-redux";
import type { AppDispatch, RootState } from "../stores/store";

import { clearAlert } from "../stores/alertSlice";
import { setIsSubscriptionFormOpen } from "../stores/uiSlice";
import { AlertCommandType } from "../types/AlertToasts";

export const Toaster = () => {
  const useAppDispatch: () => AppDispatch = useDispatch;
  const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
  const dispatch = useAppDispatch();

  const open = useAppSelector((state) => state.alerts.open);
  const severity = useAppSelector((state) => state.alerts.severity);
  const alertMessage = useAppSelector((state) => state.alerts.message);
  const title = useAppSelector((state) => state.alerts.title);
  const timeout = useAppSelector((state) => state.alerts.timeout);
  const link = useAppSelector((state) => state.alerts.link);
  const func = useAppSelector((state) => state.alerts.func);

  const alertState = useAppSelector((state) => state.alerts);

  const handleClose = () => {
    dispatch(clearAlert());
  };

  const splitByNewline = alertMessage.split("\n");

  useEffect(() => {}, [alertState]);

  return (
    <Snackbar
      className="alert-toast"
      autoHideDuration={timeout}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      open={open}
      onClose={handleClose}
      key="bottom_right"
    >
      <Alert
        severity={severity.toString() as AlertColor}
        className="alert-popup"
      >
        <AlertTitle>{title}</AlertTitle>
        {splitByNewline.map((line: string, idx: number) => {
          return (
            <div key={idx} className="line">
              {line}
            </div>
          );
        })}
        {func ? (
          <p>
            <a
              href="#"
              onClick={() => {
                switch (func.type) {
                  case AlertCommandType.subscribe:
                    dispatch(setIsSubscriptionFormOpen(true));
                    break;
                }
              }}
            >
              {func.text}
            </a>
          </p>
        ) : null}
        {link ? (
          <a href={link.url} target="_blank">
            {link.text}
          </a>
        ) : null}
      </Alert>
    </Snackbar>
  );
};
