"use client";

import { useEffect, useState } from "react";
import { defaultSiteCopy, type SiteCopy } from "../lib/site-copy";

export function useSiteCopy() {
  const [copy, setCopy] = useState<SiteCopy>({ ...defaultSiteCopy });
  useEffect(() => {
    fetch("/api/site-copy", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((data) => {
      if (data?.copy) setCopy({ ...defaultSiteCopy, ...data.copy });
    }).catch(() => undefined);
  }, []);
  return copy;
}
