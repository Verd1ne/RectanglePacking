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

// Theme configuration
const theme = {
  colors: {
    primary: '#2196F3',
    secondary: '#1976D2',
    background: '#F5F5F5',
    surface: '#FFFFFF',
    text: '#212121',
    textSecondary: '#757575',
    border: '#E0E0E0',
    success: '#4CAF50',
    error: '#F44336',
    visualization: {
      main: '#2196F3',
      border: '#FFFFFF',
      background: '#FFFFFF',
    },
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
  },
};

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
}

// Component Props Interfaces
interface CustomInputProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: 'numeric' | 'default';
}

interface CustomButtonProps {
  title: string;
  onPress: () => void;
}

interface ResultsCardProps {
  maxFit: number | null;
  residue: number | null;
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
    backgroundColor: '#fff',
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

    setResults({maxFit, residue});
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

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x1 = x_offset + col * dim1 * scale;
          const y1 = y_offset + row * dim2 * scale;
          rects.push(
            <View
              key={`${x1}-${y1}`}
              style={{
                position: 'absolute',
                left: x1,
                top: y1,
                width: dim1 * scale,
                height: dim2 * scale,
                backgroundColor: '#4E79A7',
                borderWidth: 1,
                borderColor: '#fff',
              }}
            />,
          );
        }
      }
      return rects;
    };

    const renderHorizontalStack = () => {
      return (
        <View style={{marginTop: 20}}>
          <Text style={[styles.visualizationLabel, {color: '#000'}]}>
            Horizontal Stacking:
          </Text>
          <View
            style={{
              position: 'relative',
              width: L * scale + 20,
              height: W * scale + 20,
            }}>
            <View
              style={{
                position: 'absolute',
                left: 10,
                top: 10,
                width: L * scale,
                height: W * scale,
                borderColor: 'black',
                borderWidth: 2,
              }}
            />
            {drawRegion(10, 10, L, W, l, w)}
          </View>
        </View>
      );
    };

    const renderVerticalStack = () => {
      return (
        <View style={{marginTop: 20}}>
          <Text style={[styles.visualizationLabel, {color: '#000'}]}>
            Vertical Stacking:
          </Text>
          <View
            style={{
              position: 'relative',
              width: L * scale + 20,
              height: W * scale + 20,
            }}>
            <View
              style={{
                position: 'absolute',
                left: 10,
                top: 10,
                width: L * scale,
                height: W * scale,
                borderColor: 'black',
                borderWidth: 2,
              }}
            />
            {drawRegion(10, 10, L, W, w, l)}
          </View>
        </View>
      );
    };

    return (
      <View>
        <Text style={[styles.visualizationLabel, {color: '#000'}]}>
          Optimized Packing:
        </Text>
        <View
          style={{
            position: 'relative',
            width: L * scale + 20,
            height: W * scale + 20,
          }}>
          {/* Main container */}
          <View
            style={{
              position: 'absolute',
              left: 10,
              top: 10,
              width: L * scale,
              height: W * scale,
              borderColor: 'black',
              borderWidth: 2,
            }}
          />
          {simpleMode ? (
            // Simple packing
            (() => {
              const vert_simp = calculateFit(w, l, L, W);
              const hori_simp = calculateFit(l, w, L, W);
              return vert_simp > hori_simp
                ? drawRegion(10, 10, L, W, w, l)
                : drawRegion(10, 10, L, W, l, w);
            })()
          ) : (
            // Complex packing with splits
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
          )}
        </View>
        {renderHorizontalStack()}
        {renderVerticalStack()}
      </View>
    );
  };

  // Custom Input Component
  const CustomInput: React.FC<CustomInputProps> = ({
    label,
    value,
    onChangeText,
    keyboardType = 'numeric',
  }) => (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        keyboardType={keyboardType}
        value={value}
        onChangeText={onChangeText}
        placeholderTextColor={theme.colors.textSecondary}
      />
    </View>
  );

  // Custom Button Component
  const CustomButton: React.FC<CustomButtonProps> = ({title, onPress}) => (
    <TouchableOpacity style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{title}</Text>
    </TouchableOpacity>
  );

  // Results Card Component
  const ResultsCard: React.FC<ResultsCardProps> = ({maxFit, residue}) => (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Results</Text>
      <View style={styles.resultItem}>
        <Text style={styles.resultLabel}>Max Small Papers:</Text>
        <Text style={styles.resultValue}>{maxFit ?? 'N/A'}</Text>
      </View>
      <View style={styles.resultItem}>
        <Text style={styles.resultLabel}>Paper Scraps:</Text>
        <Text style={styles.resultValue}>
          {residue?.toFixed(2) ?? 'N/A'} units²
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={theme.colors.background}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={styles.scrollView}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>2D Square Cut Optimizer</Text>
            <Text style={styles.subtitle}>
              Optimize your paper cutting process
            </Text>
          </View>

          {/* Input Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dimensions</Text>
            <CustomInput
              label="Plano Length"
              value={inputs.bigPaperL}
              onChangeText={text => handleInputChange('bigPaperL', text)}
            />
            <CustomInput
              label="Plano Width"
              value={inputs.bigPaperW}
              onChangeText={text => handleInputChange('bigPaperW', text)}
            />
            <CustomInput
              label="Size Into Length"
              value={inputs.smallPaperL}
              onChangeText={text => handleInputChange('smallPaperL', text)}
            />
            <CustomInput
              label="Size Into Width"
              value={inputs.smallPaperW}
              onChangeText={text => handleInputChange('smallPaperW', text)}
            />
            <CustomInput
              label="Margin Length"
              value={inputs.marginLength}
              onChangeText={text => handleInputChange('marginLength', text)}
            />
            <CustomInput
              label="Margin Width"
              value={inputs.marginWidth}
              onChangeText={text => handleInputChange('marginWidth', text)}
            />
          </View>

          {/* Calculate Button */}
          <CustomButton title="Calculate Packing" onPress={onCalculate} />

          {/* Results Section */}
          <ResultsCard maxFit={results.maxFit} residue={results.residue} />

          {/* Visualization Section */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Packing Visualization</Text>
            {renderVisualization()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Updated Styles
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  scrollView: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: theme.spacing.md,
  },
  header: {
    alignItems: 'center',
    marginBottom: theme.spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  subtitle: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  inputGroup: {
    marginBottom: theme.spacing.md,
  },
  label: {
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: theme.spacing.xs,
  },
  input: {
    height: 48,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.borderRadius.md,
    paddingHorizontal: theme.spacing.md,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.surface,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    marginVertical: theme.spacing.md,
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
    marginBottom: theme.spacing.sm,
  },
  resultLabel: {
    fontSize: 16,
    color: theme.colors.textSecondary,
  },
  resultValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  visualizationContainer: {
    marginTop: theme.spacing.md,
  },
  visualizationLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
});

export default App;
function alert(arg0: string) {
  throw new Error('Function not implemented.');
}
