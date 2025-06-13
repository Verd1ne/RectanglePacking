/**
 * Paper Packing Visualizer App
 * https://github.com/facebook/react-native
 *
 * @format
 */
import React, {useState} from 'react';
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

    const drawRegion = (
      x_offset: number,
      y_offset: number,
      region_L: number,
      region_W: number,
      dim1: number,
      dim2: number,
    ) => {
      const rects = [];
      const cols = Math.floor(region_L / dim1);
      const rows = Math.floor(region_W / dim2);

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
          const x1 = x_offset + col * dim1 * scale;
          const y1 = y_offset + row * dim2 * scale;
          const colorIndex = (row + col) % colors.length;
          rects.push(
            <View
              key={`${x1}-${y1}`}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: dim1 * scale,
                height: dim2 * scale,
                backgroundColor: colors[colorIndex],
                borderWidth: 1,
                borderColor: '#FFFFFF',
                shadowColor: '#000',
                shadowOffset: {
                  width: 0,
                  height: 2,
                },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }}
            />,
          );
        }
      }
      return rects;
    };

    const renderVisualizationContainer = (
      title: string,
      children: React.ReactNode,
    ) => (
      <View style={styles.visualizationSection}>
        <Text style={styles.visualizationLabel}>{title}</Text>
        <View style={styles.visualizationWrapper}>
          <View
            style={[
              styles.visualizationBox,
              {
                width: L * scale + 20,
                height: W * scale + 20,
              },
            ]}>
            <View
              style={[
                styles.visualizationBorder,
                {
                  width: L * scale,
                  height: W * scale,
                },
              ]}
            />
            {children}
          </View>
        </View>
      </View>
    );

    const renderHorizontalStack = () => {
      return renderVisualizationContainer(
        'Horizontal Packing',
        drawRegion(10, 10, L, W, l, w),
      );
    };

    const renderVerticalStack = () => {
      return renderVisualizationContainer(
        'Vertical Packing',
        drawRegion(10, 10, L, W, w, l),
      );
    };

    return (
      <View style={styles.visualizationContainer}>
        {renderVisualizationContainer(
          'Optimized Packing',
          simpleMode ? (
            (() => {
              const vert_simp = calculateFit(w, l, L, W);
              const hori_simp = calculateFit(l, w, L, W);
              return vert_simp > hori_simp
                ? drawRegion(10, 10, L, W, w, l)
                : drawRegion(10, 10, L, W, l, w);
            })()
          ) : (
            <>
              {(() => {
                const vert_1 = calculateFit(w, l, splitLength, splitWidth);
                const hori_1 = calculateFit(l, w, splitLength, splitWidth);
                return vert_1 > hori_1
                  ? drawRegion(10, 10, splitLength, splitWidth, w, l)
                  : drawRegion(10, 10, splitLength, splitWidth, l, w);
              })()}
              {(() => {
                const vert_2 = calculateFit(w, l, L - splitLength, splitWidth);
                const hori_2 = calculateFit(l, w, L - splitLength, splitWidth);
                return vert_2 > hori_2
                  ? drawRegion(
                      10 + splitLength * scale,
                      10,
                      L - splitLength,
                      splitWidth,
                      w,
                      l,
                    )
                  : drawRegion(
                      10 + splitLength * scale,
                      10,
                      L - splitLength,
                      splitWidth,
                      l,
                      w,
                    );
              })()}
              {(() => {
                const vert_3 = calculateFit(w, l, splitLength, W - splitWidth);
                const hori_3 = calculateFit(l, w, splitLength, W - splitWidth);
                return vert_3 > hori_3
                  ? drawRegion(
                      10,
                      10 + splitWidth * scale,
                      splitLength,
                      W - splitWidth,
                      w,
                      l,
                    )
                  : drawRegion(
                      10,
                      10 + splitWidth * scale,
                      splitLength,
                      W - splitWidth,
                      l,
                      w,
                    );
              })()}
              {(() => {
                const vert_4 = calculateFit(
                  w,
                  l,
                  L - splitLength,
                  W - splitWidth,
                );
                const hori_4 = calculateFit(
                  l,
                  w,
                  L - splitLength,
                  W - splitWidth,
                );
                return vert_4 > hori_4
                  ? drawRegion(
                      10 + splitLength * scale,
                      10 + splitWidth * scale,
                      L - splitLength,
                      W - splitWidth,
                      w,
                      l,
                    )
                  : drawRegion(
                      10 + splitLength * scale,
                      10 + splitWidth * scale,
                      L - splitLength,
                      W - splitWidth,
                      l,
                      w,
                    );
              })()}
            </>
          ),
        )}
        {renderHorizontalStack()}
        {renderVerticalStack()}
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
            <Text style={styles.title}>2D Square Cut Optimizer</Text>
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
  visualizationContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  visualizationSection: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
  },
  visualizationWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  visualizationBox: {
    position: 'relative',
    alignSelf: 'center',
    backgroundColor: '#F7FAFC',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  visualizationBorder: {
    position: 'absolute',
    left: 10,
    top: 10,
    borderColor: '#2D3748',
    borderWidth: 2,
    borderRadius: 4,
    backgroundColor: '#FFFFFF',
  },
  visualizationLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2D3748',
    marginBottom: 12,
    textAlign: 'center',
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
