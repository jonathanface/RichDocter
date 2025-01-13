import { loadStripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";

import { useEffect, useMemo } from "react";
import "./css/main.css";
import { ConfigPanelModal } from "./sections/UserConfigPanel";
import { DocumentEditorPage } from "./sections/DocumentEditor";
import { LoginPanelModal } from "./sections/LoginPanel";
import { SplashPage } from "./sections/SplashPage";
import { StoryAndSeriesListing } from "./sections/StoryAndSeriesListing";
import { SubscribePanel } from "./sections/SubscribePanel";
import { UserMenu } from "./sections/UserMenu";

import { useHandleNavigationHandler } from "./hooks/useNavigationHandler";
import { StoryAction, useCurrentStoryContext } from "./contexts/selections";
import { useFetchUserData } from "./hooks/useFetchUserData";
import { CreatEditStoryPanel } from "./sections/CreateEditStoryPanel";

export const Docter = () => {

  console.log("Docter mounted");
  useEffect(() => {
    return () => console.log("Docter unmounted");
  }, []);

  const { isLoggedIn, isLoadingUser } = useFetchUserData();
  const { handleNavChange } = useHandleNavigationHandler();
  const stripeKey: string = import.meta.env.VITE_STRIPE_KEY ?? "";
  const stripe = useMemo(() => loadStripe(stripeKey), [stripeKey]);

  const { currentStory, currentStoryAction } = useCurrentStoryContext();

  useEffect(() => {
    handleNavChange();
  }, [handleNavChange]);

  const renderContent = () => {
    if (!isLoadingUser) {
      if (
        isLoggedIn &&
        currentStory &&
        currentStoryAction === StoryAction.editing
      ) {
        return <DocumentEditorPage />;
      }
      if (
        (isLoggedIn && !currentStory) ||
        (isLoggedIn && currentStory && currentStoryAction === StoryAction.none)
      ) {
        return <StoryAndSeriesListing />;
      }
      return <SplashPage />
    }
    return <div />
  }

  return (
    <div className="App">
      <main>
        <header>
          <UserMenu />
          <h4>
            <span>D</span>octer<span className="tld">.io</span>
            <div className="version">ver 1.0.1</div>
          </h4>
        </header>
        {renderContent()}
        <CreatEditStoryPanel />
        {/*
        <EditStoryModal />
        <EditSeriesModal /> */}
        <ConfigPanelModal />
        <LoginPanelModal />
      </main>
      <Elements stripe={stripe}>
        <SubscribePanel />
      </Elements>
    </div>
  );
}

