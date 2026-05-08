import React, { ReactNode, useState, useCallback, useEffect } from 'react';
import classNames from 'classnames';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  Icons,
  Button,
  ToolButton,
} from '../';
import { IconPresentationProvider } from '@ohif/ui-next';

import NavBar from '../NavBar';

interface HeaderProps {
  children?: ReactNode;
  menuOptions: Array<{
    title: string;
    icon?: string;
    onClick: () => void;
  }>;
  isReturnEnabled?: boolean;
  onClickReturnButton?: () => void;
  isSticky?: boolean;
  WhiteLabeling?: {
    createLogoComponentFn?: (React: any, props: any) => ReactNode;
  };

  PatientInfo?: ReactNode;
  Secondary?: ReactNode;
  UndoRedo?: ReactNode;
  onOpenReport?: () => void;
}


function Header({
  children,
  menuOptions,
  isReturnEnabled = true,
  onClickReturnButton,
  isSticky = false,
  WhiteLabeling,
  PatientInfo,
  UndoRedo,
  onOpenReport,
  Secondary,
  ...props
}: HeaderProps): ReactNode {
  const onClickReturn = () => {
    if (isReturnEnabled && onClickReturnButton) {
      onClickReturnButton();
    }
  };

  const [isRadiologist, setIsRadiologist] = useState(false);

  useEffect(() => {
    let cancelled = false;
    import('../../../../../extensions/default/src/services/BackendService').then(({ UserService }) => {
      UserService.getMe().then(user => {
        if (!cancelled && user?.role) {
          console.log('Header - Auth Role:', user.role);
          setIsRadiologist(user.role === 'radiologist');
        }
      });
    }).catch(err => console.error('Header - Failed to fetch role:', err));
    return () => { cancelled = true; };
  }, []);

  return (
    <IconPresentationProvider
      size="large"
      IconContainer={ToolButton}
    >
      <NavBar
        isSticky={isSticky}
        {...props}
      >
        {/* ===== DESKTOP HEADER (md and above) ===== */}
        <div className="relative hidden h-[48px] items-center md:block">
          {/* Left: Logo + back arrow */}
          <div className="absolute left-0 top-1/2 flex -translate-y-1/2 items-center">
            <div
              className={classNames(
                'mr-3 inline-flex items-center',
                isReturnEnabled && 'cursor-pointer'
              )}
              onClick={onClickReturn}
              data-cy="return-to-work-list"
            >
              {isReturnEnabled && <Icons.ArrowLeft className="text-primary ml-1 h-7 w-7 transition-transform hover:-translate-x-0.5" />}
              <div className="ml-2 flex items-center bg-primary/5 border border-primary/15 px-3 py-1.5 rounded-xl backdrop-blur-md shadow-[0_0_15px_rgba(45,212,191,0.05)] transition-all hover:bg-primary/10 hover:border-primary/25">
                <div className="mr-2.5 h-7 w-7 overflow-hidden rounded-full border border-primary/20 bg-primary/10 shadow-inner">
                  <img
                    src="/assets/ArmorrayLogo.jpeg"
                    alt="Armorray Logo"
                    className="h-full w-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-500"
                  />
                </div>
                <div className="flex flex-col -space-y-1">
                  <div className="flex items-center">
                    <span className="text-foreground text-lg font-black tracking-tighter">ARMOR</span>
                    <span className="text-primary text-lg font-extralight tracking-tighter">RAY</span>
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-[0.35em] text-white/30">Radiologist Viewer</span>
                </div>
              </div>
            </div>
          </div>

          {/* Left-center: Secondary toolbar */}
          <div className="absolute top-1/2 left-[250px] h-8 -translate-y-1/2">{Secondary}</div>

          {/* Center: UndoRedo + Primary toolbar children */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform">
            <div className="flex items-center justify-center space-x-2">
              {UndoRedo}
              {children}
            </div>
          </div>

          {/* Right: Report button + Patient Info + Settings (no UndoRedo here anymore) */}
          <div className="absolute right-0 top-1/2 flex -translate-y-1/2 select-none items-center">
            {isRadiologist && onOpenReport && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onOpenReport}
                  className="bg-primary/10 border-primary/30 text-primary hover:bg-primary/20 hover:text-primary transition-all rounded-lg px-3 py-1.5 h-8 font-medium shadow-[0_0_10px_rgba(45,212,191,0.05)]"
                >
                  <Icons.ByName
                    name="clipboard"
                    className="w-4 h-4 mr-2"
                  />
                  Report
                </Button>
                <div className="border-primary/15 mx-2 h-6 border-r"></div>
              </>
            )}
            {PatientInfo}
            <div className="border-primary/15 mx-2 h-6 border-r"></div>
            <div className="flex-shrink-0">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-primary hover:bg-primary/10 hover:text-primary transition-all rounded-lg h-9 w-9 mt-0.5"
                  >
                    <Icons.GearSettings className="w-5 h-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {menuOptions.map((option, index) => {
                    const IconComponent = option.icon
                      ? Icons[option.icon as keyof typeof Icons]
                      : null;
                    return (
                      <DropdownMenuItem
                        key={index}
                        onSelect={option.onClick}
                        className="flex items-center gap-2 py-2"
                      >
                        {IconComponent && (
                          <span className="flex h-4 w-4 items-center justify-center">
                            <Icons.ByName name={option.icon} />
                          </span>
                        )}
                        <span className="flex-1">{option.title}</span>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* ===== MOBILE HEADER (below md) ===== */}
        <div className="grid h-[48px] grid-cols-[auto_1fr_auto] items-center px-2 md:hidden">
          {/* Left: Logo/Back */}
          <div className="flex items-center">
            <div
              className={classNames(
                'inline-flex items-center',
                isReturnEnabled && 'cursor-pointer'
              )}
              onClick={onClickReturn}
              data-cy="return-to-work-list-mobile"
            >
              {isReturnEnabled && <Icons.ArrowLeft className="text-primary h-6 w-6 transition-transform hover:-translate-x-0.5" />}
              <div className="ml-1 flex items-center bg-primary/5 border border-primary/15 px-2 py-1 rounded-xl backdrop-blur-md transition-all">
                <div className="h-6 w-6 overflow-hidden rounded-full border border-primary/20 bg-primary/10 shadow-inner">
                  <img
                    src="/assets/ArmorrayLogo.jpeg"
                    alt="Armorray Logo"
                    className="h-full w-full object-cover grayscale-[0.2]"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Center: Undo/Redo */}
          <div className="flex items-center justify-center">
            {UndoRedo}
          </div>

          {/* Right: PatientInfo + Settings */}
          <div className="flex items-center gap-1">
            <div className="max-w-[100px] overflow-hidden">
              {PatientInfo}
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-primary hover:bg-primary/10 transition-all rounded-lg h-8 w-8"
                >
                  <Icons.GearSettings className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {menuOptions.map((option, index) => {
                  const IconComponent = option.icon
                    ? Icons[option.icon as keyof typeof Icons]
                    : null;
                  return (
                    <DropdownMenuItem
                      key={index}
                      onSelect={option.onClick}
                      className="flex items-center gap-2 py-2"
                    >
                      {IconComponent && (
                        <span className="flex h-4 w-4 items-center justify-center">
                          <Icons.ByName name={option.icon} />
                        </span>
                      )}
                      <span className="flex-1">{option.title}</span>
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </NavBar>
    </IconPresentationProvider>
  );
}

export default Header;