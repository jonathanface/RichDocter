import Alert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";
import Snackbar from "@mui/material/Snackbar";
import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSubscriptionFormOpen } from "../stores/uiSlice";

import {
  setAlertLink,
  setAlertMessage,
  setAlertOpen,
  setAlertSeverity,
  setAlertTimeout,
  setAlertTitle,
} from "../stores/alertSlice";

const Toaster = () => {
  const dispatch = useDispatch();
  const open = useSelector((state) => state.alerts.open);
  const severity = useSelector((state) => state.alerts.severity);
  const alertMessage = useSelector((state) => state.alerts.message);
  const title = useSelector((state) => state.alerts.title);
  const timeout = useSelector((state) => state.alerts.timeout);
  const link = useSelector((state) => state.alerts.link);

  const openSubscribe = () => {
    dispatch(setSubscriptionFormOpen(true));
  };

  const handleClose = () => {
    dispatch(setAlertOpen(false));
    setTimeout(() => {
      dispatch(setAlertMessage(""));
      dispatch(setAlertSeverity("info"));
      dispatch(setAlertTitle("Announcement"));
      dispatch(setAlertTimeout(6000));
      dispatch(setAlertLink({}));
    }, 500);
  };

  const splitByNewline = alertMessage.split("\n");

  return (
    <Snackbar
      className="alert-toast"
      autoHideDuration={timeout}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      open={open}
      onClose={handleClose}
      key="bottom_right">
      <Alert severity={severity} className="alert-popup">
        <AlertTitle>{title}</AlertTitle>
        {splitByNewline.map((line, idx) => {
          return (
            <div key={idx} className="line">
              {line}
            </div>
          );
        })}
        {link && link.location && link.location === "subscribe" ? (
          <p>
            <a href="#" onClick={openSubscribe}>
              SUBSCRIBE/RENEW
            </a>
          </p>
        ) : null}
        {link && link.location && link.location === "contact" ? (
          <a href="mailto:support@docter.io">support@docter.io</a>
        ) : null}
        {link && link.url ? (
          <a href={link.custom.url} target="_blank">
            {link.custom.text}
          </a>
        ) : null}
      </Alert>
    </Snackbar>
  );
};
export default Toaster;
