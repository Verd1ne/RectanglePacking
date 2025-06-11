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
  Button,
  StyleSheet,
  StatusBar,
} from 'react-native';

// const theme = {
//   light: {
//     text: '#000000',
//     background: '#FFFFFF',
//     // Add other colors as needed
//   },
//   dark: {
//     text: '#FFFFFF',
//     background: '#000000',
//     // Add other colors as needed
//   },
// };

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

  return (
    <SafeAreaView style={backgroundStyle}>
      <StatusBar barStyle={'light-content'} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        style={backgroundStyle}>
        <View
          style={[
            styles.container,
            {backgroundColor: backgroundStyle.backgroundColor},
          ]}>
          {/* Input Fields */}
          <View>
            <Text
              style={{
                textAlign: 'center',
                fontWeight: 'bold',
                fontSize: 24,
                marginVertical: 5,
                color: '#000000',
              }}>
              2D Square Cut Optimizer
            </Text>
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: '#000'}]}>Plano Length:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={inputs.bigPaperL}
              onChangeText={text => handleInputChange('bigPaperL', text)}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: '#000'}]}>Plano Width:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={inputs.bigPaperW}
              onChangeText={text => handleInputChange('bigPaperW', text)}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: '#000'}]}>
              Size Into Length:
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={inputs.smallPaperL}
              onChangeText={text => handleInputChange('smallPaperL', text)}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: '#000'}]}>
              Size Into Width:
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={inputs.smallPaperW}
              onChangeText={text => handleInputChange('smallPaperW', text)}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: '#000'}]}>Margin Length:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={inputs.marginLength}
              onChangeText={text => handleInputChange('marginLength', text)}
            />
          </View>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, {color: '#000'}]}>Margin Width:</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={inputs.marginWidth}
              onChangeText={text => handleInputChange('marginWidth', text)}
            />
          </View>

          {/* Calculate Button */}
          <Button
            title="Calculate Packing"
            onPress={onCalculate}
            color="#1E90FF"
          />

          {/* Results */}
          <View style={styles.resultsContainer}>
            <Text style={[styles.resultLabel, {color: '#000'}]}>Results:</Text>
            <Text style={[styles.resultText, {color: '#000'}]}>
              Max Small Papers: {results.maxFit ?? 'N/A'}
            </Text>
            <Text style={[styles.resultText, {color: '#000'}]}>
              Paper Scraps: {results.residue?.toFixed(2) ?? 'N/A'}
            </Text>
          </View>

          {/* Visualization */}
          <View style={styles.visualizationContainer}>
            <Text style={[styles.visualizationLabel, {color: '#000'}]}>
              Packing Visualization:
            </Text>
            {renderVisualization()}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
  },
  input: {
    flex: 1,
    height: 40,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    paddingHorizontal: 10,
  },
  resultsContainer: {
    marginTop: 20,
  },
  resultLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  resultText: {
    fontSize: 16,
    marginBottom: 5,
  },
  visualizationContainer: {
    marginTop: 20,
  },
  visualizationLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
});

export default App;
function alert(arg0: string) {
  throw new Error('Function not implemented.');
}
