package io.github.yaqxuan.contextvocabularynotebook;

import com.getcapacitor.BridgeActivity;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(PinnedHttpPlugin.class);
        registerPlugin(LanDiscoveryPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
