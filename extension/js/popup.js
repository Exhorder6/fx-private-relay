/* global browser */

function getOnboardingPanels() {
  return {
    "panel1": {
      "imgSrc": "tip1-icon.svg",
      "tipHeadline": "Welcome!",
      "tipBody": "When the Firefox Relay icon appears on a website, select it to generate a new relay address.",

    },
    "panel2": {
      "imgSrc": "tip2-icon.svg",
      "tipHeadline": "Don't see the icon?",
      "tipBody":"Right click (Windows) or control+click (Mac) to open the context menu easily generate a new realy from there",
    },
    "panel3": {
      "imgSrc": "tip3-icon.svg",
      "tipHeadline": "Getting too many emails?",
      "tipBody":"Manage your relay addresses and easily toggle Forwarding to Blocking.",
    },
    "maxAliasesPanel": {
      "imgSrc": "high-five.svg",
      "tipHeadline": "High five!",
      "tipBody": "You’re a Firefox Relay power user!",
    },
  };
}


function showSignUpPanel() {
  const signUpOrInPanel = document.querySelector(".sign-up-panel");
  document.body.classList.add("sign-up");
  return signUpOrInPanel.classList.remove("hidden");
}


async function showRelayPanel(tipPanelToShow) {
  const onboardingPanelWrapper = document.querySelector("onboarding-panel");
  const tipImageEl = onboardingPanelWrapper.querySelector("img");
  const tipHeadlineEl = onboardingPanelWrapper.querySelector("h1");
  const tipBodyEl = onboardingPanelWrapper.querySelector("p");
  const currentPanel = onboardingPanelWrapper.querySelector(".current-panel");
  const onboardingPanelStrings = getOnboardingPanels();

  const updatePanel = (numRemaining, panelId) => {
    const panelToShow = (numRemaining === 0) ? "maxAliasesPanel" : `panel${panelId}`;
    onboardingPanelWrapper.classList = [panelToShow];
    const panelStrings = onboardingPanelStrings[`${panelToShow}`];

    tipImageEl.src = `/images/panel-images/${panelStrings.imgSrc}`;
    tipHeadlineEl.textContent = panelStrings.tipHeadline;
    tipBodyEl.textContent = panelStrings.tipBody;
    currentPanel.textContent = `${panelId}`;
    return;
  };

  const { relayAddresses, maxNumAliases } = await getRemainingAliases();
  const remainingAliasMessage = document.querySelector(".aliases-remaining");
  const numRemainingEl = remainingAliasMessage.querySelector(".num-aliases-remaining");
  const numRemaining = maxNumAliases - relayAddresses.length;
  const maxNumAliasesEl = remainingAliasMessage.querySelector(".max-num-aliases");
  maxNumAliasesEl.textContent = `/${maxNumAliases}`;
  numRemainingEl.textContent = numRemaining;

  document.body.classList.add("relay-panel");
  updatePanel(numRemaining, tipPanelToShow);

  document.querySelectorAll(".panel-nav").forEach(navBtn => {
    navBtn.addEventListener("click", () => {
      // pointer events are disabled in popup CSS for the "previous" button on panel 1
      // and the "next" button on panel 3
      const nextPanel = (navBtn.dataset.direction === "-1") ? -1 : 1;
      return updatePanel(numRemaining, tipPanelToShow+=nextPanel);
    });
  });

  const relayPanel = document.querySelector(".signed-in-panel");
  return relayPanel.classList.remove("hidden");
}


async function getAllAliases() {
  return await browser.storage.local.get("relayAddresses");
}


async function getRemainingAliases() {
  const { relayAddresses } = await getAllAliases();
  const { maxNumAliases } = await browser.storage.local.get("maxNumAliases");
  return { relayAddresses, maxNumAliases };
}


function enableSettingsPanel() {
  const settingsToggles = document.querySelectorAll(".settings-toggle");
  settingsToggles.forEach(toggle => {
    toggle.addEventListener("click", () => {
      document.body.classList.toggle("show-settings");
    });
  });
}


async function enableInputIconDisabling() {
  const inputIconVisibilityToggle = document.querySelector(".toggle-icon-in-page-visibility");

  const stylePrefToggle = (inputsEnabled) => {
    if (inputsEnabled === "show-input-icons") {
      inputIconVisibilityToggle.dataset.iconVisibilityOption = "disable-input-icon";
      inputIconVisibilityToggle.classList.remove("input-icons-disabled");
      return;
    }
    inputIconVisibilityToggle.dataset.iconVisibilityOption = "enable-input-icon";
    inputIconVisibilityToggle.classList.add("input-icons-disabled");
  };


  const areInputIconsEnabled = await browser.storage.local.get("showInputIcons");
  stylePrefToggle(areInputIconsEnabled.showInputIcons);

  inputIconVisibilityToggle.addEventListener("click", async() => {
    const userIconPreference = (inputIconVisibilityToggle.dataset.iconVisibilityOption === "disable-input-icon") ? "hide-input-icons" : "show-input-icons";
    await browser.runtime.sendMessage({
      method: "updateInputIconPref",
      iconPref: userIconPreference,
    });
    return stylePrefToggle(userIconPreference);
  });

}


async function popup() {
  const userApiToken = await browser.storage.local.get("apiToken");
  const signedInUser = (userApiToken.hasOwnProperty("apiToken"));
  if (!signedInUser) {
    showSignUpPanel();
  }

  if (signedInUser) {
    showRelayPanel(1);
    enableSettingsPanel();
    enableInputIconDisabling();
  }

  document.querySelectorAll(".close-popup-after-click").forEach(el => {
    el.addEventListener("click", async (e) => {
      e.preventDefault();
      await browser.tabs.create({ url: el.href });
      window.close();
    });
  });

  const { fxaOauthFlow } = await browser.storage.local.get("fxaOauthFlow");
  const { relaySiteOrigin } = await browser.storage.local.get("relaySiteOrigin");

  document.querySelectorAll(".login-link").forEach(loginLink => {
    loginLink.href = fxaOauthFlow;
  });

  document.querySelectorAll(".dashboard-link").forEach(dashboardLink => {
    dashboardLink.href = `${relaySiteOrigin}/accounts/profile?utm_source=fx-relay-addon&utm_medium=popup&utm_campaign=beta&utm_content=manage-relay-addresses`;
  });
}

document.addEventListener("DOMContentLoaded", popup);
