import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LoadingIndicatorProgress } from '@ohif/ui-next';
import { ShareService } from '../../../../extensions/default/src/services/BackendService';

export function ShareTokenGate({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const hashParams = new URLSearchParams(location.hash?.substring(location.hash.indexOf('?') + 1) || '');
  const shareToken = searchParams.get('shareToken') || hashParams.get('shareToken');

  const [isValidating, setIsValidating] = useState(!!shareToken);
  const [isAuthorized, setIsAuthorized] = useState(!shareToken);
  const [errorMsg, setErrorMsg] = useState(null);

  useEffect(() => {
    if (!shareToken) return;

    const validateToken = async () => {
      try {
        const data = await ShareService.validateShareToken(shareToken);
        if (data && data.valid) {
          // Store valid token in custom storage or let BackendService use it
          // the BackendService uses axios withCredentials so we just need to hit the API, 
          // wait, the API uses the token to validate, but how does the viewer authenticate requests?
          // The backend API might need the token passed for /cases/:id calls.
          window.sessionStorage.setItem('shareToken', shareToken);
          window.sessionStorage.setItem('shareRole', data.role);
          window.sessionStorage.setItem('shareAllowedTools', JSON.stringify(data.allowedTools || []));
          
          setIsAuthorized(true);
        } else {
          setErrorMsg('Session expired or invalid.');
          setIsAuthorized(false);
        }
      } catch (err) {
        setIsAuthorized(false);
        setErrorMsg('Session expired or invalid.');
      } finally {
        setIsValidating(false);
      }
    };

    validateToken();
  }, [shareToken]);

  if (isValidating) {
    return <LoadingIndicatorProgress className="w-full h-full bg-black" />;
  }

  if (!isAuthorized) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black text-white p-6 z-50">
        <div className="bg-secondary-dark p-8 rounded-lg max-w-md text-center shadow-lg border border-primary-main/20">
          <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">Session Expired</h2>
          <p className="text-gray-400 mb-6">{errorMsg || 'Your secure sharing session has expired or the link is invalid.'}</p>
          <p className="text-sm text-primary-light">Please contact your administrator or the referrer for a new link.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
