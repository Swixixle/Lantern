import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

export default function Review() {
  const params = useParams<{ corpusId: string }>();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (params.corpusId) {
      navigate(`/?corpusId=${params.corpusId}`, { replace: true });
    }
  }, [params.corpusId, navigate]);

  return null;
}
