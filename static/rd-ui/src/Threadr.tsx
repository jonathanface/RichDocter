import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useEffect, useState } from "react";
import type { TypedUseSelectorHook } from "react-redux";
import { useSelector } from "react-redux";
import "./css/main.css";
import { ConfigPanelModal } from "./sections/ConfigPanel";
import { CreateNewStoryModal } from "./sections/CreateNewStoryModal";
import { DocumentEditor } from "./sections/DocumentEditor";
import { EditSeriesModal } from "./sections/EditSeriesModal";
import { EditStoryModal } from "./sections/EditStoryModal";
import { LoginPanelModal } from "./sections/LoginPanelModal";
import { SplashPage } from "./sections/SplashPage";
import { StoryAndSeriesListing } from "./sections/StoryAndSeriesListing";
import { Subscribe } from "./sections/Subscribe";
import { UserMenu } from "./sections/UserMenu";
import type { RootState } from "./stores/store";
import { Toaster } from "./utils/Toaster";
import { useFetchUserData } from "./hooks/useFetchUserData";
import { useHandleNavigationHandler } from "./hooks/useNavigationHandler";

export const Threadr = () => {
  const { isLoading } = useFetchUserData();
  const { handleNavChange } = useHandleNavigationHandler();
  const stripeKey: string = import.meta.env.REACT_APP_STRIPE_KEY ?? "";
  const [stripe] = useState(() => loadStripe(stripeKey));

  const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
  const isLoggedIn = useAppSelector((state) => state.user.isLoggedIn);
  const selectedStory = useAppSelector((state) => state.stories.selectedStory);
  const storyToEdit = useAppSelector((state) => state.stories.storyBeingEdited);
  const seriesToEdit = useAppSelector(
    (state) => state.series.seriesBeingEdited
  );

  useEffect(() => {
    handleNavChange();
  }, [handleNavChange]);

  const renderContent = () => {
    if (isLoading) return <div />;
    if (isLoggedIn && selectedStory) return <DocumentEditor />;
    if (isLoggedIn && !selectedStory) return <StoryAndSeriesListing />;
    return <SplashPage />;
  };
  const displayComponent = renderContent();

  return (
    <div className="App">
      <main>
        <header>
          <UserMenu
            isParentLoading={isLoading}
            isLoggedIn={isLoggedIn}
            userDetails={null}
          />
          <h4>
            <span>D</span>octer<span className="tld">.io</span>
            <div className="version">ver 1.0.1</div>
          </h4>
        </header>
        {displayComponent}
        <CreateNewStoryModal />
        <EditStoryModal story={storyToEdit} />
        <EditSeriesModal series={seriesToEdit} />
        <ConfigPanelModal />
        <LoginPanelModal />
      </main>
      <Toaster />
      <Elements stripe={stripe}>
        <Subscribe />
      </Elements>
    </div>
  );
};
