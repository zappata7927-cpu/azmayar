package ir.azmayar.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    // Capacitor creates the bridge inside super.onCreate() (BridgeActivity.load()),
    // so plugins registered afterwards never reach the bridge. Registering BEFORE
    // super.onCreate() is what makes LeitnerBridge (widget sync) actually work.
    registerPlugin(LeitnerBridgePlugin.class);
    super.onCreate(savedInstanceState);
  }
}
