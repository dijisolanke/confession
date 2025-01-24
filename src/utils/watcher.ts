import devtools from "devtools-detect";

interface DevToolsEvent extends Event {
  detail: {
    isOpen: boolean;
  };
}

export function preventDevToolsInspection(): () => void {
  const handleDevToolsChange = (event: DevToolsEvent) => {
    if (event.detail.isOpen) {
      document.body.style.display = "none";
    } else {
      document.body.style.display = "block";
    }
  };

  window.addEventListener(
    "devtoolschange",
    handleDevToolsChange as EventListener
  );

  // Initial check
  if (devtools.isOpen) {
    document.body.style.display = "none";
  }

  // Cleanup function
  return () => {
    window.removeEventListener(
      "devtoolschange",
      handleDevToolsChange as EventListener
    );
  };
}
