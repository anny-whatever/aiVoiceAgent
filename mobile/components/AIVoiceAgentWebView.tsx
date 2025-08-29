import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Text,
} from "react-native";
import { WebView } from "react-native-webview";

type Props = { url?: string };

export default function AIVoiceAgentWebView({ url }: Props) {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Fallback timeout to hide loading after 15 seconds
  useEffect(() => {
    const timeout = setTimeout(() => {
      console.log('Fallback timeout: hiding loading screen');
      setLoading(false);
    }, 15000);
    
    return () => clearTimeout(timeout);
  }, []);
  const webRef = useRef<WebView>(null);

  // Ask Android for mic permission (runtime)
  useEffect(() => {
    (async () => {
      if (Platform.OS === "android") {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO
        );
        if (result !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            "Microphone permission required",
            "Enable microphone permission in Settings to use the voice agent."
          );
          setReady(false);
          return;
        }
      }
      setReady(true);
    })();
  }, []);

  const agentUrl =
    url ??
    "https://newtest.complianceone.ai/?api=5a0fe6a5eb768c1bb43999b8aa56a7cf&uid=0RzeMsFE8EdpQSAFnh70VeyLnIr2";

  // Try direct URL loading first, fallback to iframe if needed
  const [useDirectUrl, setUseDirectUrl] = useState(true);
  const [loadAttempts, setLoadAttempts] = useState(0);
  
  const html = `<!doctype html>
<html>
  <head>
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
    <meta http-equiv="Content-Security-Policy" content="frame-ancestors *; frame-src *; default-src * 'unsafe-inline' 'unsafe-eval'; script-src * 'unsafe-inline' 'unsafe-eval';">
    <style>
      html,body{height:100%;margin:0;padding:0;background:#000;color:#fff;font-family:Arial,sans-serif}
      .loading{display:flex;align-items:center;justify-content:center;height:100vh;flex-direction:column}
      .spinner{border:4px solid #333;border-top:4px solid #fff;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite}
      @keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}
    </style>
  </head>
  <body>
    <div class="loading">
      <div class="spinner"></div>
      <p>Redirecting to AI Voice Agent...</p>
    </div>
    <script>
      // Immediate redirect to the actual URL
      setTimeout(() => {
        window.location.href = "${agentUrl}";
      }, 1000);
      
      // Notify React Native
      window.ReactNativeWebView && window.ReactNativeWebView.postMessage('redirecting');
    </script>
  </body>
</html>`;

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text style={styles.msg}>Waiting for microphone permission…</Text>
      </View>
    );
  }

  return (
    <View style={styles.flex}>
      {loading && (
        <View style={styles.overlay}>
          <ActivityIndicator size="large" color="#0066cc" />
          <Text style={styles.msg}>Loading AI Voice Agent…</Text>
          <Text style={styles.debugText}>
            {useDirectUrl ? 'Direct URL Loading' : 'Iframe Loading'} (Attempt {loadAttempts + 1})
          </Text>
        </View>
      )}
      <WebView
          ref={webRef}
          source={useDirectUrl ? { uri: agentUrl } : { html, baseUrl: "https://newtest.complianceone.ai" }}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          // Note: onPermissionRequest is Android-specific and may not be available in all versions
          startInLoadingState
          mixedContentMode="compatibility"
          allowsFullscreenVideo
          allowsBackForwardNavigationGestures
        onLoadStart={() => {
          console.log('WebView load started');
          setLoading(true);
        }}
        onLoadEnd={() => {
          console.log('WebView load ended');
          setLoading(false);
        }}
        onLoad={() => {
          console.log('WebView loaded');
          setLoading(false);
        }}
        onMessage={(event) => {
          const message = event.nativeEvent.data;
          console.log('WebView message:', message);
          
          // Hide loading when we get any load confirmation
          if (message === 'redirecting' || message === 'iframe_loaded' || message === 'force_load_end' || message === 'dom_ready') {
            setLoading(false);
          }
          
          // Handle console logs from WebView
          try {
            const parsed = JSON.parse(message);
            if (parsed.type && parsed.type.startsWith('console:')) {
              console.log(`WebView ${parsed.type}:`, ...parsed.args);
            }
          } catch (e) {
            // Not JSON, ignore
          }
        }}
        onError={(e) => {
          console.error("WebView error", e.nativeEvent);
          setLoading(false);
          
          // If direct URL fails and we haven't tried iframe yet, switch to iframe
          if (useDirectUrl && loadAttempts < 2) {
            console.log('Direct URL failed, switching to iframe approach');
            setUseDirectUrl(false);
            setLoadAttempts(prev => prev + 1);
            setLoading(true);
          } else {
            Alert.alert("Failed to load", "Check your network and try again.");
          }
        }}
        onHttpError={(e: any) => {
           console.error("WebView HTTP error", e.nativeEvent);
           setLoading(false);
           
           // If direct URL fails and we haven't tried iframe yet, switch to iframe
           if (useDirectUrl && loadAttempts < 2) {
             console.log('Direct URL failed, switching to iframe approach');
             setUseDirectUrl(false);
             setLoadAttempts(prev => prev + 1);
             setLoading(true);
           }
         }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 16 },
  overlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    alignItems: "center", justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)", zIndex: 1,
  },
  msg: { marginTop: 12, fontSize: 14, textAlign: "center" },
  debugText: { marginTop: 8, fontSize: 12, textAlign: "center", color: "#666" },
});
