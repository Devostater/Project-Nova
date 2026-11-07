package com.azi.projectnova;

import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;

/**
 * Opens Project Nova in the full Quest Browser (not a Trusted Web Activity / Custom Tab).
 * The Custom Tab ran the game in a small 2D window without a working "Enter VR"; the full
 * browser supports WebXR (VR and passthrough MR) exactly like opening the link by hand.
 * The game itself is hosted on GitHub Pages and updates on every push to main.
 */
public class LauncherActivity extends Activity {
    static final String GAME_URL = "https://devostater.github.io/Project-Nova/standalone.html";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Intent view = new Intent(Intent.ACTION_VIEW, Uri.parse(GAME_URL));
        view.addCategory(Intent.CATEGORY_BROWSABLE);
        view.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        view.setPackage("com.oculus.browser");
        try {
            startActivity(view);
        } catch (ActivityNotFoundException e) {
            view.setPackage(null); // not on a Quest: any browser
            try { startActivity(view); } catch (ActivityNotFoundException ignored) { }
        }
        finish();
    }
}
