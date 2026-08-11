import React from 'react';
import { Settings, Info } from 'lucide-react';
import {
    ToolWindowLevel, ToolCapture, ToolLayout, ToolCrosshair, ToolStackScroll, ToolLength,
    ToolBidirectional, ToolAnnotate, ToolRectangle, ToolCircle, ToolFreehandRoi,
    ToolSplineRoi, ToolMagneticRoi, ToolAngle, ToolCobbAngle, ToolCalibrate,
    ToolUltrasoundBidirectional, ToolReset, ToolRotateRight, ToolFlipHorizontal,
    ToolInvert, ToolStackImageSync, ToolReferenceLines, ToolWindowRegion, ToolCine,
    ToolProbe, ToolMagnify, ToolQuickMagnify, ToolDicomTagBrowser, ToolSegmentLabel,
    Tool3DRotate, ToolMeasureEllipse
} from './OHIFIcons/Sources/Tools';

import { ToolPan } from './OHIFIcons/Sources/ToolPan';
import { ToolZoom as ToolZoomCustom } from './OHIFIcons/Sources/ToolZoom';
import OrientationSwitch from './OHIFIcons/Sources/OrientationSwitch';
import Threshold from './OHIFIcons/Sources/Threshold';
import Opacity from './OHIFIcons/Sources/Opacity';
import WindowLevelAdvanced from './OHIFIcons/Sources/WindowLevelAdvanced';
import StatusTracking from './OHIFIcons/Sources/StatusTracking';

interface ViewerToolIconProps extends React.SVGProps<SVGSVGElement> {
    toolId: string;
}

export function ViewerToolIcon({ toolId, ...props }: ViewerToolIconProps) {
    const defaultProps = { width: "16", height: "16", ...props };

    switch (toolId) {
        // Navigation
        case 'WindowLevel': return <ToolWindowLevel {...defaultProps} />;
        case 'Pan': return <ToolPan {...defaultProps} />;
        case 'Zoom': return <ToolZoomCustom {...defaultProps} />;
        case 'TrackballRotate': return <Tool3DRotate {...defaultProps} />;
        case 'Capture': return <ToolCapture {...defaultProps} />;
        case 'Layout': return <ToolLayout {...defaultProps} />;
        case 'Crosshairs': return <ToolCrosshair {...defaultProps} />;
        case 'StackScroll': return <ToolStackScroll {...defaultProps} />;

        // Measurements
        case 'Length': return <ToolLength {...defaultProps} />;
        case 'Bidirectional': return <ToolBidirectional {...defaultProps} />;
        case 'ArrowAnnotate': return <ToolAnnotate {...defaultProps} />;
        case 'EllipticalROI': return <ToolMeasureEllipse {...defaultProps} />;
        case 'RectangleROI': return <ToolRectangle {...defaultProps} />;
        case 'CircleROI': return <ToolCircle {...defaultProps} />;
        case 'PlanarFreehandROI': return <ToolFreehandRoi {...defaultProps} />;
        case 'SplineROI': return <ToolSplineRoi {...defaultProps} />;
        case 'LivewireContour': return <ToolMagneticRoi {...defaultProps} />;
        case 'Angle': return <ToolAngle {...defaultProps} />;
        case 'CobbAngle': return <ToolCobbAngle {...defaultProps} />;
        case 'CalibrationLine': return <ToolCalibrate {...defaultProps} />;
        case 'UltrasoundDirectionalTool': return <ToolUltrasoundBidirectional {...defaultProps} />;

        // Image Controls
        case 'Reset': return <ToolReset {...defaultProps} />;
        case 'rotate-right': return <ToolRotateRight {...defaultProps} />;
        case 'flipHorizontal': return <ToolFlipHorizontal {...defaultProps} />;
        case 'invert': return <ToolInvert {...defaultProps} />;
        case 'ImageSliceSync': return <ToolStackImageSync {...defaultProps} />;
        case 'ReferenceLines': return <ToolReferenceLines {...defaultProps} />;
        case 'WindowLevelRegion': return <ToolWindowRegion {...defaultProps} />;
        case 'Cine': return <ToolCine {...defaultProps} />;

        // Inspection & Analysis
        case 'Probe': return <ToolProbe {...defaultProps} />;
        case 'Magnify': return <ToolMagnify {...defaultProps} />;
        case 'AdvancedMagnify': return <ToolQuickMagnify {...defaultProps} />;
        case 'TagBrowser': return <ToolDicomTagBrowser {...defaultProps} />;
        case 'SegmentLabelTool': return <ToolSegmentLabel {...defaultProps} />;

        // Menus / Specialized
        case 'orientationMenu': return <OrientationSwitch {...defaultProps} />;
        case 'windowLevelMenu': return <ToolWindowLevel {...defaultProps} />;
        case 'windowLevelMenuEmbedded': return <ToolWindowLevel {...defaultProps} />;
        case 'voiManualControlMenu': return <WindowLevelAdvanced {...defaultProps} />;
        case 'thresholdMenu': return <Threshold {...defaultProps} />;
        case 'opacityMenu': return <Opacity {...defaultProps} />;
        case 'trackingStatus': return <StatusTracking {...defaultProps} />;

        // Fallbacks
        case 'dataOverlayMenu':
        case 'modalityLoadBadge':
        case 'navigationComponent':
        case 'ImageOverlayViewer':
        case 'Colorbar':
        default:
            return <Settings {...defaultProps} />;
    }
}
