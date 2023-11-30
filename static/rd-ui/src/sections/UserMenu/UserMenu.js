import Person4Icon from "@mui/icons-material/Person4";
import { IconButton } from "@mui/material";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { setSelectedStory } from "../../stores/storiesSlice";
import { setIsLoaderVisible } from "../../stores/uiSlice";
import { flipConfigPanelVisible, flipLoggedInState } from "../../stores/userSlice";

const UserMenu = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const isLoggedIn = useSelector((state) => state.user.isLoggedIn);
  const dispatch = useDispatch();

  const signin = () => {
    window.location.href = "/auth/google";
  };

  const showUserSettings = () => {
    dispatch(flipConfigPanelVisible());
  };

  const signout = () => {
    dispatch(setIsLoaderVisible(false));
    fetch("/logout/google", {
      method: "DELETE",
    })
      .then((response) => {
        if (response.ok) {
          dispatch(setSelectedStory(null));
          dispatch(flipLoggedInState());
          const history = window.history;
          history.pushState({}, "", "/");
          return;
        }
        throw new Error("Fetch problem logout " + response.status);
      })
      .catch((error) => {
        console.error(error);
      });
  };

  const displayComponent = !props.isParentLoading ? (
    isLoggedIn ? (
      <span
        className="menu-container"
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}>
        <span className="icon">
          <IconButton size="small" sx={{ zIndex: 99 }} aria-label="user menu">
            <Person4Icon fontSize="small" className={"menu-icon"} />
          </IconButton>
        </span>
        {isOpen && (
          <ul>
            <li onClick={showUserSettings}>Settings</li>
            <li onClick={signout}>Signout</li>
          </ul>
        )}
      </span>
    ) : (
      <a onClick={signin}>SignIn</a>
    )
  ) : (
    <div />
  );

  return <span className="user-menu">{displayComponent}</span>;
};

export default UserMenu;
