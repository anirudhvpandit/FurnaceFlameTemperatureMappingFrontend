import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const CameraSyncContext = createContext(null);

/** Keeps navigation identical across every visible comparison furnace. */
export function CameraSyncProvider({ children }) {
  const [controlsRefs, setControlsRefs] = useState([]);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const isSyncingRef = useRef(false);

  const registerControls = useCallback((controls) => {
    setControlsRefs((current) => current.includes(controls) ? current : [...current, controls]);
  }, []);
  const unregisterControls = useCallback((controls) => {
    setControlsRefs((current) => current.filter((item) => item !== controls));
  }, []);

  useEffect(() => {
    if (!syncEnabled || controlsRefs.length < 2) return undefined;

    const synchronizeFrom = (source) => {
      if (isSyncingRef.current) return;
      isSyncingRef.current = true;
      controlsRefs.forEach((destination) => {
        if (destination === source) return;
        destination.object.position.copy(source.object.position);
        destination.object.quaternion.copy(source.object.quaternion);
        destination.object.up.copy(source.object.up);
        destination.object.zoom = source.object.zoom;
        destination.target.copy(source.target);
        destination.object.updateProjectionMatrix();
        destination.update();
      });
      isSyncingRef.current = false;
    };

    const listeners = controlsRefs.map((controls) => {
      const onChange = () => synchronizeFrom(controls);
      controls.addEventListener("change", onChange);
      return { controls, onChange };
    });
    return () => listeners.forEach(({ controls, onChange }) => controls.removeEventListener("change", onChange));
  }, [controlsRefs, syncEnabled]);

  const value = useMemo(() => ({ registerControls, unregisterControls, setSyncEnabled }), [registerControls, unregisterControls]);
  return <CameraSyncContext.Provider value={value}>{children}</CameraSyncContext.Provider>;
}

export function useCameraSync() {
  return useContext(CameraSyncContext);
}
