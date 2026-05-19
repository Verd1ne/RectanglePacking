/**
 * Paper Packing Visualizer App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, {useEffect, useState} from 'react';
import {
  SafeAreaView,
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  Modal,
  NativeModules,
} from 'react-native';

// Interface for Input State
interface Inputs {
  bigPaperL: string;
  bigPaperW: string;
  smallPaperL: string;
  smallPaperW: string;
  marginLength: string;
  marginWidth: string;
}

// Interface for Results State
interface Results {
  maxFit: number | null;
  residue: number | null;
  scrapPercentage?: number;
}

type PackingType = 'optimized' | 'horizontal' | 'vertical';
type MeasurementGuideSide = 'top' | 'right' | 'bottom' | 'left';

interface MeasurementGuideSegment {
  size: number;
  label: string;
}

const {PackingOrientation} = NativeModules as {
  PackingOrientation?: {
    lockLandscape: () => void;
    unlockOrientation: () => void;
  };
};

const MEASUREMENT_GUIDE = {
  topLaneHeight: 28,
  bottomLaneHeight: 28,
  rightLaneWidth: 44,
  leftLaneWidth: 44,
  expandedLeftLaneWidth: 52,
  laneGap: 4,
  labelGap: 8,
  capSize: 8,
  capSpan: 17,
  dimensionLabelWidth: 168,
  lineColor: '#718096',
};

// Core logic remains unchanged
const calculateFit = (
  smallLength: number,
  smallWidth: number,
  bigLength: number,
  bigWidth: number,
): number => {
  if (bigLength < smallLength || bigWidth < smallWidth) return 0;
  return (
    Math.floor(bigLength / smallLength) * Math.floor(bigWidth / smallWidth)
  );
};

const maxRectanglesFit = (
  L: number,
  W: number,
  l: number,
  w: number,
): [number, [number, number], boolean] => {
  let bestSplit: [number, number] = [0, 0];
  let maxFit = 0;
  let simpleMode = true;

  // Check both orientations for simple packing
  const original = calculateFit(l, w, L, W);
  const rotated = calculateFit(w, l, L, W);
  maxFit = Math.max(original, rotated);

  // Test all possible splits and orientations
  for (let splitLength = 0; splitLength <= L; splitLength++) {
    for (let splitWidth = 0; splitWidth <= W; splitWidth++) {
      // Test all 16 possible orientation combinations (2^4)
      // For each region, we have 2 possible orientations

      // Region 1: Top-left
      const fit1_ori1 = calculateFit(l, w, splitLength, splitWidth);
      const fit1_ori2 = calculateFit(w, l, splitLength, splitWidth);
      const fit1 = Math.max(fit1_ori1, fit1_ori2);

      // Region 2: Top-right
      const fit2_ori1 = calculateFit(l, w, L - splitLength, splitWidth);
      const fit2_ori2 = calculateFit(w, l, L - splitLength, splitWidth);
      const fit2 = Math.max(fit2_ori1, fit2_ori2);

      // Region 3: Bottom-left
      const fit3_ori1 = calculateFit(l, w, splitLength, W - splitWidth);
      const fit3_ori2 = calculateFit(w, l, splitLength, W - splitWidth);
      const fit3 = Math.max(fit3_ori1, fit3_ori2);

      // Region 4: Bottom-right
      const fit4_ori1 = calculateFit(l, w, L - splitLength, W - splitWidth);
      const fit4_ori2 = calculateFit(w, l, L - splitLength, W - splitWidth);
      const fit4 = Math.max(fit4_ori1, fit4_ori2);

      const totalFit = fit1 + fit2 + fit3 + fit4;

      if (totalFit > maxFit) {
        maxFit = totalFit;
        bestSplit = [splitLength, splitWidth];
        simpleMode = false;
      }
    }
  }

  return [maxFit, bestSplit, simpleMode];
};

const calculateResidue = (
  L: number,
  W: number,
  l: number,
  w: number,
  maxFit: number,
): number => {
  return L * W - maxFit * l * w;
};

const formatCm = (value: number): string => {
  const rounded = Number.isInteger(value) ? value.toString() : value.toFixed(2);
  return `${rounded} unit`;
};

function App(): React.JSX.Element {
  const backgroundStyle = {
    backgroundColor: '#F5F7FA',
  };

  // State variables with TypeScript types
  const [inputs, setInputs] = useState<Inputs>({
    bigPaperL: '',
    bigPaperW: '',
    smallPaperL: '',
    smallPaperW: '',
    marginLength: '0', // Default margin length
    marginWidth: '0', // Default margin width
  });
  const [results, setResults] = useState<Results>({
    maxFit: null,
    residue: null,
  });
  const [visualizationData, setVisualizationData] = useState<{
    L: number;
    W: number;
    l: number;
    w: number;
    maxFit: number;
    bestSplit: [number, number];
    simpleMode: boolean;
  } | null>(null);
  const [expandedPacking, setExpandedPacking] = useState<PackingType | null>(
    null,
  );

  useEffect(() => {
    if (expandedPacking) {
      PackingOrientation?.lockLandscape();
    } else {
      PackingOrientation?.unlockOrientation();
    }

    return () => PackingOrientation?.unlockOrientation();
  }, [expandedPacking]);

  // Handle input changes
  const handleInputChange = (name: keyof Inputs, value: string) => {
    setInputs(prev => ({...prev, [name]: value}));
  };

  // Handle calculation
  const onCalculate = () => {
    const {
      bigPaperL,
      bigPaperW,
      smallPaperL,
      smallPaperW,
      marginLength,
      marginWidth,
    } = inputs;
    const numericInputs = {
      L: parseFloat(bigPaperL),
      W: parseFloat(bigPaperW),
      l: parseFloat(smallPaperL),
      w: parseFloat(smallPaperW),
      marginLength: parseFloat(marginLength || '0'),
      marginWidth: parseFloat(marginWidth || '0'),
    };

    if (
      isNaN(numericInputs.L) ||
      isNaN(numericInputs.W) ||
      isNaN(numericInputs.l) ||
      isNaN(numericInputs.w) ||
      numericInputs.L <= 0 ||
      numericInputs.W <= 0 ||
      numericInputs.l <= 0 ||
      numericInputs.w <= 0
    ) {
      alert('Please enter valid positive numbers for all dimensions.');
      return;
    }

    // Adjust small paper dimensions with margins
    const adjustedSmallPaperL = Math.max(
      numericInputs.l + numericInputs.marginLength * 2,
      numericInputs.w + numericInputs.marginWidth * 2,
    );
    const adjustedSmallPaperW = Math.min(
      numericInputs.l + numericInputs.marginLength * 2,
      numericInputs.w + numericInputs.marginWidth * 2,
    );

    // Ensure visualization is in portrait mode
    const [L, W] =
      numericInputs.L >= numericInputs.W
        ? [numericInputs.L, numericInputs.W]
        : [numericInputs.W, numericInputs.L];

    const [maxFit, bestSplit, simpleMode] = maxRectanglesFit(
      L,
      W,
      adjustedSmallPaperL,
      adjustedSmallPaperW,
    );
    const residue = calculateResidue(
      L,
      W,
      adjustedSmallPaperL,
      adjustedSmallPaperW,
      maxFit,
    );

    // Calculate total area and scrap percentage
    const totalArea = L * W;
    const scrapPercentage = (residue / totalArea) * 100;

    setResults({maxFit, residue, scrapPercentage});
    setVisualizationData({
      L,
      W,
      l: adjustedSmallPaperL,
      w: adjustedSmallPaperW,
      maxFit,
      bestSplit,
      simpleMode,
    });
  };

  const createLegendPaperSize = (paperLength: number, paperWidth: number) => {
    const maxLegendSide = 46;
    const minLegendSide = 17;
    const legendScale = maxLegendSide / Math.max(paperLength, paperWidth);

    return {
      width: Math.max(minLegendSide, paperLength * legendScale),
      height: Math.max(minLegendSide, paperWidth * legendScale),
    };
  };

  const renderOrientationLegendItem = (
    orientationType: 'horizontal' | 'vertical',
    title: string,
    paperLength: number,
    paperWidth: number,
  ) => {
    const previewSize = createLegendPaperSize(paperLength, paperWidth);

    return (
      <View style={styles.legendPaperItem}>
        <Text style={styles.legendPaperTitle}>{title}</Text>
        <View style={styles.legendPaperDiagram}>
          <View
            style={[
              styles.legendPaperHeightGuide,
              {
                height: previewSize.height,
              },
            ]}>
            <View style={styles.legendPaperHeightLine}>
              <View style={styles.legendPaperHeightCap} />
              <View
                style={[
                  styles.legendPaperHeightCap,
                  styles.legendPaperHeightCapEnd,
                ]}
              />
            </View>
            <Text style={styles.legendPaperHeightText}>
              {formatCm(paperWidth)}
            </Text>
          </View>
          <View style={styles.legendPaperPreviewStack}>
            <View
              style={[
                styles.legendPaperPreview,
                {
                  width: previewSize.width,
                  height: previewSize.height,
                },
              ]}>
              <Text
                style={[
                  styles.legendPaperPreviewText,
                  orientationType === 'horizontal' &&
                    styles.rotatedOrientationText,
                ]}>
                A
              </Text>
            </View>
            <View
              style={[
                styles.legendPaperWidthGuide,
                {
                  width: previewSize.width,
                },
              ]}>
              <View style={styles.legendPaperWidthLine}>
                <View style={styles.legendPaperWidthCap} />
                <View
                  style={[
                    styles.legendPaperWidthCap,
                    styles.legendPaperWidthCapEnd,
                  ]}
                />
              </View>
              <Text style={styles.legendPaperWidthText}>
                {formatCm(paperLength)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderOrientationLegend = () => {
    if (!visualizationData) return null;

    const {l, w} = visualizationData;

    return (
      <View style={styles.resultsLegendBlock}>
        <Text style={styles.resultsLegendTitle}>Orientation Legend</Text>
        <View style={styles.legendRow}>
          {renderOrientationLegendItem('horizontal', 'Horizontal', l, w)}
          {renderOrientationLegendItem('vertical', 'Vertical', w, l)}
        </View>
      </View>
    );
  };

  // Render visualization
  const renderVisualization = () => {
    if (!visualizationData) return null;

    const {L, W, l, w, maxFit, bestSplit, simpleMode} = visualizationData;

    const widestSide = Math.max(L, W);

    let scale = 100;

    if (widestSide >= 500) {
      scale = 0.5;
    } else if (widestSide >= 300) {
      scale = 1;
    } else if (widestSide >= 200) {
      scale = 1.5;
    } else if (widestSide >= 150) {
      scale = 2;
    } else if (widestSide >= 100) {
      scale = 2.5;
    } else if (widestSide >= 80) {
      scale = 3;
    } else if (widestSide >= 50) {
      scale = 5;
    } else {
      scale = 10;
    }

    const [splitLength, splitWidth] = bestSplit;
    const getRegionFit = (region_L: number, region_W: number) => {
      const horizontalCols = Math.floor(region_L / l);
      const horizontalRows = Math.floor(region_W / w);
      const verticalCols = Math.floor(region_L / w);
      const verticalRows = Math.floor(region_W / l);
      const horizontalTotal = horizontalCols * horizontalRows;
      const verticalTotal = verticalCols * verticalRows;

      if (verticalTotal > horizontalTotal) {
        return {
          cols: verticalCols,
          rows: verticalRows,
          total: verticalTotal,
          orientation: 'vertical',
        };
      }

      return {
        cols: horizontalCols,
        rows: horizontalRows,
        total: horizontalTotal,
        orientation: 'horizontal',
      };
    };

    const getWholeFitForPacking = (packingType: PackingType) => {
      if (packingType === 'horizontal') {
        return {
          cols: Math.floor(L / l),
          rows: Math.floor(W / w),
          total: calculateFit(l, w, L, W),
          orientation: 'horizontal',
        };
      }

      if (packingType === 'vertical') {
        return {
          cols: Math.floor(L / w),
          rows: Math.floor(W / l),
          total: calculateFit(w, l, L, W),
          orientation: 'vertical',
        };
      }

      return getRegionFit(L, W);
    };

    const getTopCutSegments = (packingType: PackingType) => {
      if (packingType !== 'optimized' || simpleMode) {
        return [{size: L, cuts: getWholeFitForPacking(packingType).cols}];
      }

      return [
        {
          size: splitLength,
          cuts: getRegionFit(splitLength, splitWidth).cols,
        },
        {
          size: L - splitLength,
          cuts: getRegionFit(L - splitLength, splitWidth).cols,
        },
      ].filter(segment => segment.size > 0);
    };

    const getRightCutSegments = (packingType: PackingType) => {
      if (packingType !== 'optimized' || simpleMode) {
        return [{size: W, cuts: getWholeFitForPacking(packingType).rows}];
      }

      return [
        {
          size: splitWidth,
          cuts: getRegionFit(L - splitLength, splitWidth).rows,
        },
        {
          size: W - splitWidth,
          cuts: getRegionFit(L - splitLength, W - splitWidth).rows,
        },
      ].filter(segment => segment.size > 0);
    };

    const renderMeasurementGuide = (
      side: MeasurementGuideSide,
      length: number,
      segments: MeasurementGuideSegment[],
      diagramScale: number,
      expanded = false,
    ) => {
      const isHorizontal = side === 'top' || side === 'bottom';
      const scaledLength = length * diagramScale;
      const hasSegments = segments.length > 0;

      if (isHorizontal) {
        return (
          <View
            style={[
              styles.measurementGuideHorizontal,
              side === 'top'
                ? styles.measurementGuideTop
                : styles.measurementGuideBottom,
              {
                width: scaledLength,
              },
            ]}>
            {hasSegments && (
              <View style={styles.measurementHorizontalSegments}>
                {segments.map((segment, index) => (
                  <View
                    key={`${side}-${index}`}
                    style={[
                      styles.measurementHorizontalSegment,
                      {
                        width: segment.size * diagramScale,
                      },
                    ]}>
                    <View
                      style={[
                        styles.measurementLineHorizontal,
                        side === 'top'
                          ? styles.measurementLineHorizontalTop
                          : styles.measurementLineHorizontalBottom,
                      ]}>
                      <View style={styles.measurementCapOnHorizontalLine} />
                      <View
                        style={[
                          styles.measurementCapOnHorizontalLine,
                          styles.measurementCapHorizontalEnd,
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.measurementLabel,
                        side === 'top'
                          ? styles.measurementLabelTop
                          : styles.measurementLabelBottom,
                        expanded && styles.expandedDimensionText,
                      ]}>
                      {segment.label}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      }

      return (
        <View
          style={[
            styles.measurementGuideVertical,
            side === 'left'
              ? styles.measurementGuideLeft
              : styles.measurementGuideRight,
            expanded && side === 'left' && styles.expandedMeasurementGuideLeft,
            {
              height: scaledLength,
            },
          ]}>
          {hasSegments && (
            <View style={styles.measurementVerticalSegments}>
              {segments.map((segment, index) => (
                <View
                  key={`${side}-${index}`}
                  style={[
                    styles.measurementVerticalSegment,
                    {
                      height: segment.size * diagramScale,
                    },
                  ]}>
                  <View
                    style={[
                      styles.measurementLineVertical,
                      side === 'left'
                        ? styles.measurementLineVerticalLeft
                        : styles.measurementLineVerticalRight,
                    ]}>
                    <View style={styles.measurementCapOnVerticalLine} />
                    <View
                      style={[
                        styles.measurementCapOnVerticalLine,
                        styles.measurementCapVerticalEnd,
                      ]}
                    />
                  </View>
                  <Text
                    style={[
                      styles.measurementLabel,
                      side === 'left'
                        ? styles.measurementLabelLeft
                        : styles.measurementLabelRight,
                      expanded && styles.expandedDimensionText,
                    ]}>
                    {segment.label}
                  </Text>
                </View>
                ))}
            </View>
          )}
        </View>
      );
    };

    const getWasteForPieces = (pieces: number) => {
      const residue = calculateResidue(L, W, l, w, pieces);
      const percentage = (residue / (L * W)) * 100;

      return {percentage, residue};
    };

    const renderPackingWaste = (pieces: number) => {
      const waste = getWasteForPieces(pieces);

      return (
        <View style={styles.packingWasteOuter}>
          <View style={styles.packingWasteRow}>
            <Text style={styles.packingWasteLabel}>Waste Area:</Text>
            <Text style={styles.packingWasteValue}>
              {waste.residue.toFixed(2)} units²
              <Text style={styles.packingWastePercentage}>
                {' '}
                ({waste.percentage.toFixed(1)}% waste)
              </Text>
            </Text>
          </View>
        </View>
      );
    };

    const drawRegion = (
      x_offset: number,
      y_offset: number,
      region_L: number,
      region_W: number,
      dim1: number,
      dim2: number,
      orientationType: 'horizontal' | 'vertical',
      diagramScale: number,
    ) => {
      const rects = [];
      const cols = Math.floor(region_L / dim1);
      const rows = Math.floor(region_W / dim2);
      const markerSize = Math.max(
        8,
        Math.min(dim1 * diagramScale, dim2 * diagramScale) * 0.28,
      );

      // Generate a gradient of colors
      const colors = [
        '#4299E1', // Blue
        '#48BB78', // Green
        '#ED8936', // Orange
        '#9F7AEA', // Purple
        '#F56565', // Red
      ];

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x1 = x_offset + col * dim1 * diagramScale;
          const y1 = y_offset + row * dim2 * diagramScale;
          const colorIndex = (row + col) % colors.length;
          rects.push(
            <View
              key={`${x1}-${y1}`}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: dim1 * diagramScale,
                height: dim2 * diagramScale,
                backgroundColor: colors[colorIndex],
                borderWidth: 0.5,
                borderColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}>
              <Text
                style={[
                  styles.orientationMarker,
                  orientationType === 'horizontal' &&
                    styles.rotatedOrientationText,
                  {
                    fontSize: markerSize,
                  },
                ]}>
                A
              </Text>
            </View>,
          );
        }
      }
      return rects;
    };

    const renderPackingChildren = (
      packingType: PackingType,
      diagramScale: number,
    ): React.ReactNode => {
      if (packingType === 'horizontal') {
        return drawRegion(0, 0, L, W, l, w, 'horizontal', diagramScale);
      }

      if (packingType === 'vertical') {
        return drawRegion(0, 0, L, W, w, l, 'vertical', diagramScale);
      }

      if (simpleMode) {
        const vert_simp = calculateFit(w, l, L, W);
        const hori_simp = calculateFit(l, w, L, W);
        return vert_simp > hori_simp
          ? drawRegion(0, 0, L, W, w, l, 'vertical', diagramScale)
          : drawRegion(0, 0, L, W, l, w, 'horizontal', diagramScale);
      }

      return (
        <>
          {(() => {
            const vert_1 = calculateFit(w, l, splitLength, splitWidth);
            const hori_1 = calculateFit(l, w, splitLength, splitWidth);
            return vert_1 > hori_1
              ? drawRegion(
                  0,
                  0,
                  splitLength,
                  splitWidth,
                  w,
                  l,
                  'vertical',
                  diagramScale,
                )
              : drawRegion(
                  0,
                  0,
                  splitLength,
                  splitWidth,
                  l,
                  w,
                  'horizontal',
                  diagramScale,
                );
          })()}
          {(() => {
            const vert_2 = calculateFit(w, l, L - splitLength, splitWidth);
            const hori_2 = calculateFit(l, w, L - splitLength, splitWidth);
            return vert_2 > hori_2
              ? drawRegion(
                  splitLength * diagramScale,
                  0,
                  L - splitLength,
                  splitWidth,
                  w,
                  l,
                  'vertical',
                  diagramScale,
                )
              : drawRegion(
                  splitLength * diagramScale,
                  0,
                  L - splitLength,
                  splitWidth,
                  l,
                  w,
                  'horizontal',
                  diagramScale,
                );
          })()}
          {(() => {
            const vert_3 = calculateFit(w, l, splitLength, W - splitWidth);
            const hori_3 = calculateFit(l, w, splitLength, W - splitWidth);
            return vert_3 > hori_3
              ? drawRegion(
                  0,
                  splitWidth * diagramScale,
                  splitLength,
                  W - splitWidth,
                  w,
                  l,
                  'vertical',
                  diagramScale,
                )
              : drawRegion(
                  0,
                  splitWidth * diagramScale,
                  splitLength,
                  W - splitWidth,
                  l,
                  w,
                  'horizontal',
                  diagramScale,
                );
          })()}
          {(() => {
            const vert_4 = calculateFit(w, l, L - splitLength, W - splitWidth);
            const hori_4 = calculateFit(l, w, L - splitLength, W - splitWidth);
            return vert_4 > hori_4
              ? drawRegion(
                  splitLength * diagramScale,
                  splitWidth * diagramScale,
                  L - splitLength,
                  W - splitWidth,
                  w,
                  l,
                  'vertical',
                  diagramScale,
                )
              : drawRegion(
                  splitLength * diagramScale,
                  splitWidth * diagramScale,
                  L - splitLength,
                  W - splitWidth,
                  l,
                  w,
                  'horizontal',
                  diagramScale,
                );
          })()}
        </>
      );
    };

    const renderVisualizationContainer = (
      packingType: PackingType,
      title: string,
      pieceCount: number,
      diagramScale = scale,
      expanded = false,
    ) => {
      const children = renderPackingChildren(packingType, diagramScale);
      const guideWidth = L * diagramScale;
      const leftGuideWidth = expanded
        ? MEASUREMENT_GUIDE.expandedLeftLaneWidth
        : MEASUREMENT_GUIDE.leftLaneWidth;
      const diagramFrameWidth =
        guideWidth +
        leftGuideWidth +
        MEASUREMENT_GUIDE.rightLaneWidth +
        MEASUREMENT_GUIDE.laneGap * 2;
      const showPieceMeasurementGuides = packingType !== 'optimized';
      const topGuideSegments = showPieceMeasurementGuides
        ? getTopCutSegments(packingType).map(segment => ({
            size: segment.size,
            label: `${segment.cuts} pcs`,
          }))
        : [];
      const rightGuideSegments = showPieceMeasurementGuides
        ? getRightCutSegments(packingType).map(segment => ({
          size: segment.size,
          label: `${segment.cuts} pcs`,
        }))
        : [];
      const diagram = (
        <View style={styles.visualizationWrapper}>
          <View style={styles.measurementFrame}>
            <View style={styles.measurementTopRow}>
              <View
                style={{
                  width: leftGuideWidth + MEASUREMENT_GUIDE.laneGap,
                }}
              />
              {renderMeasurementGuide(
                'top',
                L,
                topGuideSegments,
                diagramScale,
                expanded,
              )}
              <View
                style={{
                  width:
                    MEASUREMENT_GUIDE.rightLaneWidth +
                    MEASUREMENT_GUIDE.laneGap,
                }}
              />
            </View>
            <View style={styles.measurementBodyRow}>
              {renderMeasurementGuide(
                'left',
                W,
                [{size: W, label: `Width: ${formatCm(W)}`}],
                diagramScale,
                expanded,
              )}
              <View style={{width: MEASUREMENT_GUIDE.laneGap}} />
              <View style={styles.diagramWithBottomDimension}>
                <View
                  style={[
                    styles.visualizationBox,
                    expanded && styles.expandedVisualizationBox,
                    {
                      width: guideWidth,
                      height: W * diagramScale,
                    },
                  ]}>
                  <View
                    style={[
                      styles.visualizationBorder,
                      {
                        width: L * diagramScale,
                        height: W * diagramScale,
                      },
                    ]}
                  />
                  {children}
                </View>
                {renderMeasurementGuide(
                  'bottom',
                  L,
                  [{size: L, label: `Length ${formatCm(L)}`}],
                  diagramScale,
                  expanded,
                )}
              </View>
              <View style={{width: MEASUREMENT_GUIDE.laneGap}} />
              {renderMeasurementGuide(
                'right',
                W,
                rightGuideSegments,
                diagramScale,
                expanded,
              )}
            </View>
          </View>
        </View>
      );

      return (
        <View
          style={[
            styles.visualizationSection,
            packingType !== 'optimized' && styles.visualizationSectionDivider,
          ]}>
          <View
            style={[
              styles.packingHeaderBlock,
              {
                maxWidth: '100%',
                width: diagramFrameWidth,
              },
            ]}>
            <Text style={styles.visualizationLabel}>
              {title} ({pieceCount} pieces)
            </Text>
            {renderPackingWaste(pieceCount)}
          </View>
          {expanded ? (
            diagram
          ) : (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => setExpandedPacking(packingType)}
              style={styles.previewPressable}>
              {diagram}
              <Text style={styles.previewHint}>Tap to expand</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    };

    // Calculate piece counts for each method
    const horizontalCount = calculateFit(l, w, L, W);
    const verticalCount = calculateFit(w, l, L, W);
    const packingTitles: Record<PackingType, string> = {
      optimized: 'Optimized Packing',
      horizontal: 'Horizontal Packing',
      vertical: 'Vertical Packing',
    };
    const packingCounts: Record<PackingType, number> = {
      optimized: maxFit,
      horizontal: horizontalCount,
      vertical: verticalCount,
    };
    const screen = Dimensions.get('window');
    const landscapeWidth = Math.max(screen.width, screen.height);
    const landscapeHeight = Math.min(screen.width, screen.height);
    const expandedScale = Math.max(
      scale * 1.25,
      Math.min(
        scale * 2.2,
        Math.min(
          (landscapeWidth - 130) / Math.max(L, 1),
          (landscapeHeight - 170) / Math.max(W, 1),
        ),
      ),
    );

    return (
      <View style={styles.visualizationContainer}>
        {renderVisualizationContainer(
          'optimized',
          packingTitles.optimized,
          maxFit,
        )}
        {renderVisualizationContainer(
          'horizontal',
          packingTitles.horizontal,
          horizontalCount,
        )}
        {renderVisualizationContainer(
          'vertical',
          packingTitles.vertical,
          verticalCount,
        )}
        <Modal
          animationType="slide"
          supportedOrientations={[
            'landscape',
            'landscape-left',
            'landscape-right',
          ]}
          visible={expandedPacking !== null}
          onRequestClose={() => setExpandedPacking(null)}>
          <SafeAreaView style={styles.expandedModal}>
            <View style={styles.expandedHeader}>
              <Text style={styles.expandedTitle}>
                {expandedPacking ? packingTitles[expandedPacking] : ''}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setExpandedPacking(null)}>
                <Text style={styles.closeButtonText}>Close</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              style={styles.expandedScroll}
              contentContainerStyle={styles.expandedScrollContent}>
              <ScrollView horizontal showsHorizontalScrollIndicator>
                <View
                  style={[
                    styles.expandedLandscapeStage,
                    {
                      minWidth: landscapeWidth,
                    },
                  ]}>
                  {expandedPacking &&
                    renderVisualizationContainer(
                      expandedPacking,
                      packingTitles[expandedPacking],
                      packingCounts[expandedPacking],
                      expandedScale,
                      true,
                    )}
                </View>
              </ScrollView>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, backgroundStyle]}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F7FA" />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>2D Paper Cut Optimizer</Text>
            <Text style={styles.subtitle}>
              Optimize your material cutting layout
            </Text>
          </View>

          {/* Input Fields */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Material Dimensions</Text>
            <View style={styles.inputGrid}>
              {/* Length Column */}
              <View style={styles.inputColumn}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Sheet Length:</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={inputs.bigPaperL}
                    onChangeText={text => handleInputChange('bigPaperL', text)}
                    placeholder="Enter sheet length"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Cut Length:</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={inputs.smallPaperL}
                    onChangeText={text =>
                      handleInputChange('smallPaperL', text)
                    }
                    placeholder="Enter cut length"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Margin Length:</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={inputs.marginLength}
                    onChangeText={text =>
                      handleInputChange('marginLength', text)
                    }
                    placeholder="Enter margin"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
              </View>

              {/* Width Column */}
              <View style={styles.inputColumn}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Sheet Width:</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={inputs.bigPaperW}
                    onChangeText={text => handleInputChange('bigPaperW', text)}
                    placeholder="Enter sheet width"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Cut Width:</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={inputs.smallPaperW}
                    onChangeText={text =>
                      handleInputChange('smallPaperW', text)
                    }
                    placeholder="Enter cut width"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Margin Width:</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={inputs.marginWidth}
                    onChangeText={text =>
                      handleInputChange('marginWidth', text)
                    }
                    placeholder="Enter margin"
                    placeholderTextColor="#A0AEC0"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Calculate Button */}
          <TouchableOpacity style={styles.button} onPress={onCalculate}>
            <Text style={styles.buttonText}>Optimize Layout</Text>
          </TouchableOpacity>

          {/* Results */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Optimization Results</Text>
            {renderOrientationLegend()}
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Maximum Pieces:</Text>
              <Text style={styles.resultValue}>
                {results.maxFit ?? 'N/A'} units
              </Text>
            </View>
            <View style={styles.resultItem}>
              <Text style={styles.resultLabel}>Waste Area:</Text>
              <Text style={styles.resultValue}>
                {results.residue?.toFixed(2) ?? 'N/A'} units²
                {results.scrapPercentage !== undefined && (
                  <Text style={styles.percentageText}>
                    {' '}
                    ({results.scrapPercentage.toFixed(1)}% waste)
                  </Text>
                )}
              </Text>
            </View>
          </View>

          {/* Visualization */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Layout Visualization</Text>
            {renderVisualization()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#718096',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 16,
  },
  inputGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 16,
  },
  inputColumn: {
    flex: 1,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    color: '#4A5568',
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#2D3748',
    backgroundColor: '#F7FAFC',
  },
  button: {
    backgroundColor: '#4299E1',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginVertical: 16,
    shadowColor: '#4299E1',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  resultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  resultLabel: {
    fontSize: 16,
    color: '#4A5568',
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2D3748',
  },
  resultsLegendBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsLegendTitle: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  visualizationContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  visualizationSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  visualizationSectionDivider: {
    borderTopColor: '#E2E8F0',
    borderTopWidth: 1,
    paddingTop: 24,
  },
  visualizationWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  previewPressable: {
    alignItems: 'center',
  },
  previewHint: {
    color: '#718096',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  measurementFrame: {
    alignItems: 'center',
  },
  measurementTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  measurementBodyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  diagramWithBottomDimension: {
    alignItems: 'center',
  },
  visualizationBox: {
    position: 'relative',
    alignSelf: 'center',
    backgroundColor: '#FFFFFF',
  },
  measurementGuideHorizontal: {
    height: MEASUREMENT_GUIDE.topLaneHeight,
    position: 'relative',
  },
  measurementGuideTop: {
    marginBottom: MEASUREMENT_GUIDE.laneGap,
  },
  measurementGuideBottom: {
    marginTop: MEASUREMENT_GUIDE.laneGap,
    height: MEASUREMENT_GUIDE.bottomLaneHeight,
  },
  measurementHorizontalSegments: {
    flexDirection: 'row',
    height: '100%',
  },
  measurementHorizontalSegment: {
    position: 'relative',
    alignItems: 'center',
    height: '100%',
  },
  measurementLineHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: MEASUREMENT_GUIDE.lineColor,
  },
  measurementLineHorizontalTop: {
    bottom: 0,
  },
  measurementLineHorizontalBottom: {
    top: 0,
  },
  measurementCapOnHorizontalLine: {
    position: 'absolute',
    left: 0,
    top: -MEASUREMENT_GUIDE.capSize / 2,
    width: 1,
    height: MEASUREMENT_GUIDE.capSize + 1,
    backgroundColor: MEASUREMENT_GUIDE.lineColor,
  },
  measurementCapHorizontalEnd: {
    left: undefined,
    right: 0,
  },
  measurementGuideVertical: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  measurementGuideLeft: {
    width: MEASUREMENT_GUIDE.leftLaneWidth,
  },
  measurementGuideRight: {
    width: MEASUREMENT_GUIDE.rightLaneWidth,
  },
  expandedMeasurementGuideLeft: {
    width: MEASUREMENT_GUIDE.expandedLeftLaneWidth,
  },
  measurementVerticalSegments: {
    height: '100%',
    width: '100%',
  },
  measurementVerticalSegment: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  measurementLineVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: MEASUREMENT_GUIDE.lineColor,
  },
  measurementLineVerticalLeft: {
    right: 0,
  },
  measurementLineVerticalRight: {
    left: 0,
  },
  measurementCapOnVerticalLine: {
    position: 'absolute',
    left: -MEASUREMENT_GUIDE.capSize,
    top: 0,
    width: MEASUREMENT_GUIDE.capSpan,
    height: 1,
    backgroundColor: MEASUREMENT_GUIDE.lineColor,
  },
  measurementCapVerticalEnd: {
    top: undefined,
    bottom: 0,
  },
  measurementLabel: {
    color: '#4A5568',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  measurementLabelTop: {
    bottom: MEASUREMENT_GUIDE.labelGap,
    left: 0,
    position: 'absolute',
    right: 0,
  },
  measurementLabelBottom: {
    left: 0,
    position: 'absolute',
    right: 0,
    top: MEASUREMENT_GUIDE.labelGap,
  },
  measurementLabelLeft: {
    transform: [{rotate: '-90deg'}],
    width: MEASUREMENT_GUIDE.dimensionLabelWidth,
  },
  measurementLabelRight: {
    transform: [{rotate: '90deg'}],
    width: MEASUREMENT_GUIDE.dimensionLabelWidth,
  },
  visualizationBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderColor: '#2D3748',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  visualizationLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 8,
    textAlign: 'center',
  },
  packingHeaderBlock: {
    alignItems: 'stretch',
  },
  packingWasteOuter: {
    alignItems: 'center',
    marginBottom: 12,
  },
  packingWasteRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: 12,
  },
  packingWasteLabel: {
    color: '#4A5568',
    fontSize: 14,
  },
  packingWasteValue: {
    color: '#2D3748',
    fontSize: 14,
    fontWeight: '800',
    textAlign: 'right',
  },
  packingWastePercentage: {
    color: '#718096',
    fontSize: 13,
    fontWeight: '700',
  },
  expandedModal: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  expandedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomColor: '#E2E8F0',
    borderBottomWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  expandedTitle: {
    color: '#2D3748',
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    backgroundColor: '#2D3748',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  expandedScroll: {
    flex: 1,
  },
  expandedScrollContent: {
    paddingBottom: 24,
  },
  expandedLandscapeStage: {
    minWidth: '100%',
    paddingHorizontal: 12,
    paddingBottom: 24,
  },
  expandedVisualizationBox: {},
  expandedDimensionText: {
    fontSize: 14,
  },
  legendRow: {
    alignSelf: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 10,
    backgroundColor: '#FFFFFF',
    borderColor: '#CBD5E0',
    borderRadius: 6,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  legendPaperItem: {
    alignItems: 'center',
    minWidth: 102,
  },
  legendPaperTitle: {
    color: '#2D3748',
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 7,
    textAlign: 'center',
  },
  legendPaperDiagram: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  legendPaperPreviewStack: {
    alignItems: 'center',
  },
  legendPaperPreview: {
    borderColor: '#718096',
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  legendPaperPreviewText: {
    color: '#2D3748',
    fontSize: 16,
    fontWeight: 'bold',
  },
  legendPaperHeightGuide: {
    width: 28,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  legendPaperHeightLine: {
    position: 'absolute',
    right: 5,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#A0AEC0',
  },
  legendPaperHeightCap: {
    position: 'absolute',
    left: -4,
    top: 0,
    width: 9,
    height: 1,
    backgroundColor: '#A0AEC0',
  },
  legendPaperHeightCapEnd: {
    top: undefined,
    bottom: 0,
  },
  legendPaperHeightText: {
    color: '#2D3748',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
    transform: [{rotate: '-90deg'}],
    width: 58,
  },
  legendPaperWidthGuide: {
    height: 21,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 3,
  },
  legendPaperWidthLine: {
    position: 'absolute',
    top: 4,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#A0AEC0',
  },
  legendPaperWidthCap: {
    position: 'absolute',
    left: 0,
    top: -4,
    width: 1,
    height: 9,
    backgroundColor: '#A0AEC0',
  },
  legendPaperWidthCapEnd: {
    left: undefined,
    right: 0,
  },
  legendPaperWidthText: {
    color: '#2D3748',
    fontSize: 9,
    fontWeight: '800',
    textAlign: 'center',
  },
  orientationMarker: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    color: '#FFFFFF',
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.35)',
    textShadowOffset: {
      width: 0,
      height: 1,
    },
    textShadowRadius: 2,
  },
  rotatedOrientationText: {
    transform: [{rotate: '90deg'}],
  },
  percentageText: {
    fontSize: 14,
    color: '#718096',
    marginLeft: 4,
  },
});

export default App;

// Add alert function
function alert(message: string) {
  console.warn(message);
}
