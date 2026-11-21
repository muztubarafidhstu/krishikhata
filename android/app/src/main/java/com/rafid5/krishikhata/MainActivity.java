package com.rafid5.krishikhata;

import android.Manifest;
import android.app.Activity;
import android.content.ContentValues;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.view.Window;
import android.view.WindowInsets;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import android.security.keystore.KeyGenParameterSpec;
import android.security.keystore.KeyProperties;

import org.json.JSONObject;

import java.io.File;
import java.nio.charset.StandardCharsets;
import java.security.KeyStore;
import javax.crypto.Cipher;
import javax.crypto.KeyGenerator;
import javax.crypto.SecretKey;
import javax.crypto.spec.GCMParameterSpec;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.util.regex.Pattern;

/**
 * KrishiKhata Android app: a thin, secure shell around the website.
 * First launch asks for the shop's address (e.g. "karim" → https://karim.rafid5.com) and remembers it.
 * Only addresses under BASE_DOMAIN open inside the app; everything else opens in the phone's browser.
 */
public class MainActivity extends Activity {
    private static final String DOMAIN = BuildConfig.BASE_DOMAIN;
    private static final String START_PAGE = "file:///android_asset/start.html";
    private static final String OFFLINE_PAGE = "file:///android_asset/offline.html";
    private static final Pattern SLUG = Pattern.compile("^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$");
    private static final int GREEN = Color.rgb(31, 107, 42);

    private WebView web;
    private SharedPreferences prefs;
    private long lastBack = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        prefs = getSharedPreferences("krishikhata", Context.MODE_PRIVATE);

        Window w = getWindow();
        w.setStatusBarColor(GREEN);
        w.setNavigationBarColor(GREEN);

        web = new WebView(this);
        web.setBackgroundColor(Color.rgb(238, 245, 230));
        setContentView(web);
        applyInsets(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setMediaPlaybackRequiresUserGesture(true);
        s.setUserAgentString(s.getUserAgentString() + " KrishiKhataApp/" + BuildConfig.VERSION_NAME);
        CookieManager.getInstance().setAcceptCookie(true);

        web.addJavascriptInterface(new Bridge(), "KKAndroid");
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest req) {
                Uri u = req.getUrl();
                if (isOurs(u) || "file".equals(u.getScheme())) return false;
                openOutside(u);
                return true;
            }

            @Override
            public void onReceivedError(WebView view, WebResourceRequest req, WebResourceError err) {
                if (req.isForMainFrame() && isOurs(req.getUrl())) view.loadUrl(OFFLINE_PAGE);
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                CookieManager.getInstance().flush();
                // Remember the last shop address that loaded, so the app reopens there.
                Uri u = Uri.parse(url);
                if (isOurs(u)) prefs.edit().putString("url", "https://" + u.getHost() + "/").apply();
            }
        });

        if (savedInstanceState != null && web.restoreState(savedInstanceState) != null) return;
        // Every fresh start is locked: forget the previous sign-in, then show the shop's login page
        // (number and password are filled in from the encrypted store if "remember" was ticked).
        CookieManager.getInstance().removeAllCookies(v -> { CookieManager.getInstance().flush(); openSaved(); });
    }

    /** Keeps the web page clear of the status bar, navigation bar and keyboard (Android 15 draws edge to edge). */
    private void applyInsets(View v) {
        v.setOnApplyWindowInsetsListener((view, insets) -> {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.ime() | WindowInsets.Type.displayCutout());
                view.setPadding(i.left, i.top, i.right, i.bottom);
                return WindowInsets.CONSUMED;
            }
            view.setPadding(insets.getSystemWindowInsetLeft(), insets.getSystemWindowInsetTop(), insets.getSystemWindowInsetRight(), insets.getSystemWindowInsetBottom());
            return insets.consumeSystemWindowInsets();
        });
    }

    private boolean isOurs(Uri u) {
        String host = u.getHost();
        return "https".equals(u.getScheme()) && host != null && (host.equals(DOMAIN) || host.endsWith("." + DOMAIN));
    }

    private void openOutside(Uri u) {
        try { startActivity(new Intent(Intent.ACTION_VIEW, u)); }
        catch (Exception e) { toast("এই লিংক খোলা যাচ্ছে না"); }
    }

    private void openSaved() {
        String url = prefs.getString("url", null);
        web.loadUrl(url != null ? url : START_PAGE);
    }

    /* ---------- Saved sign-in, encrypted with a key that never leaves the phone's keystore ---------- */
    private static final String KEY_NAME = "krishikhata-login";

    private SecretKey loginKey() throws Exception {
        KeyStore ks = KeyStore.getInstance("AndroidKeyStore");
        ks.load(null);
        if (ks.containsAlias(KEY_NAME)) return ((KeyStore.SecretKeyEntry) ks.getEntry(KEY_NAME, null)).getSecretKey();
        KeyGenerator kg = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore");
        kg.init(new KeyGenParameterSpec.Builder(KEY_NAME, KeyProperties.PURPOSE_ENCRYPT | KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build());
        return kg.generateKey();
    }

    private String seal(String plain) throws Exception {
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.ENCRYPT_MODE, loginKey());
        byte[] enc = c.doFinal(plain.getBytes(StandardCharsets.UTF_8));
        return Base64.encodeToString(c.getIV(), Base64.NO_WRAP) + ":" + Base64.encodeToString(enc, Base64.NO_WRAP);
    }

    private String open(String sealed) throws Exception {
        String[] p = sealed.split(":");
        Cipher c = Cipher.getInstance("AES/GCM/NoPadding");
        c.init(Cipher.DECRYPT_MODE, loginKey(), new GCMParameterSpec(128, Base64.decode(p[0], Base64.NO_WRAP)));
        return new String(c.doFinal(Base64.decode(p[1], Base64.NO_WRAP)), StandardCharsets.UTF_8);
    }

    private static String hostKey(String host) { return "login:" + (host == null ? "" : host.toLowerCase()); }

    private void toast(String m) { runOnUiThread(() -> Toast.makeText(this, m, Toast.LENGTH_LONG).show()); }

    @Override
    public void onBackPressed() {
        if (web.canGoBack()) { web.goBack(); return; }
        long now = System.currentTimeMillis();
        if (now - lastBack < 2000) { super.onBackPressed(); return; }
        lastBack = now;
        toast("বের হতে আবার চাপুন");
    }

    @Override
    protected void onSaveInstanceState(Bundle out) { super.onSaveInstanceState(out); web.saveState(out); }

    @Override
    protected void onPause() { super.onPause(); CookieManager.getInstance().flush(); }

    /** Closing the app (back button or swiping it away) locks it. */
    @Override
    protected void onDestroy() {
        if (isFinishing()) { CookieManager.getInstance().removeAllCookies(null); CookieManager.getInstance().flush(); }
        super.onDestroy();
    }

    /** Functions the web pages can call through window.KKAndroid */
    private class Bridge {
        @JavascriptInterface
        public String domain() { return DOMAIN; }

        @JavascriptInterface
        public String version() { return BuildConfig.VERSION_NAME; }

        @JavascriptInterface
        public boolean openShop(String input) {
            String slug = input == null ? "" : input.trim().toLowerCase();
            if (slug.endsWith("." + DOMAIN)) slug = slug.substring(0, slug.length() - DOMAIN.length() - 1);
            if (slug.startsWith("https://")) slug = slug.substring(8);
            if (!SLUG.matcher(slug).matches()) return false;
            String url = "https://" + slug + "." + DOMAIN + "/";
            prefs.edit().putString("url", url).apply();
            runOnUiThread(() -> { web.clearHistory(); web.loadUrl(url); });
            return true;
        }

        @JavascriptInterface
        public void saveLogin(String host, String phone, String pass) {
            try {
                JSONObject o = new JSONObject().put("phone", phone).put("pass", pass).put("t", System.currentTimeMillis());
                prefs.edit().putString(hostKey(host), seal(o.toString())).apply();
            } catch (Exception e) { prefs.edit().remove(hostKey(host)).apply(); }
        }

        @JavascriptInterface
        public String getLogin(String host) {
            String s = prefs.getString(hostKey(host), null);
            if (s == null) return "";
            try {
                String json = open(s);
                long saved = new JSONObject(json).optLong("t", System.currentTimeMillis());
                if (System.currentTimeMillis() - saved > 365L * 24 * 3600 * 1000) { prefs.edit().remove(hostKey(host)).apply(); return ""; }
                return json;
            } catch (Exception e) { prefs.edit().remove(hostKey(host)).apply(); return ""; }
        }

        @JavascriptInterface
        public void clearLogin(String host) { prefs.edit().remove(hostKey(host)).apply(); }

        @JavascriptInterface
        public void changeShop() {
            prefs.edit().remove("url").apply();
            runOnUiThread(() -> web.loadUrl(START_PAGE));
        }

        @JavascriptInterface
        public void retry() { runOnUiThread(MainActivity.this::openSaved); }

        @JavascriptInterface
        public void print() {
            runOnUiThread(() -> {
                PrintManager pm = (PrintManager) getSystemService(Context.PRINT_SERVICE);
                PrintDocumentAdapter adapter = web.createPrintDocumentAdapter("KrishiKhata-invoice");
                pm.print("KrishiKhata invoice", adapter, new PrintAttributes.Builder().setMediaSize(PrintAttributes.MediaSize.ISO_A4).build());
            });
        }

        /** Saves a generated invoice (PDF/PNG) into the phone's Downloads folder and opens it. */
        @JavascriptInterface
        public void saveFile(String name, String base64, String mime) {
            try {
                String safe = name == null ? "invoice" : name.replaceAll("[^A-Za-z0-9._-]", "_");
                byte[] data = Base64.decode(base64, Base64.DEFAULT);
                Uri uri;
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentValues v = new ContentValues();
                    v.put(MediaStore.Downloads.DISPLAY_NAME, safe);
                    v.put(MediaStore.Downloads.MIME_TYPE, mime);
                    v.put(MediaStore.Downloads.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS + "/KrishiKhata");
                    uri = getContentResolver().insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, v);
                    if (uri == null) throw new Exception("insert failed");
                    try (OutputStream os = getContentResolver().openOutputStream(uri)) { os.write(data); }
                } else {
                    if (checkSelfPermission(Manifest.permission.WRITE_EXTERNAL_STORAGE) != PackageManager.PERMISSION_GRANTED) {
                        runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.WRITE_EXTERNAL_STORAGE}, 1));
                        toast("অনুমতি দিন, তারপর আবার ডাউনলোড চাপুন");
                        return;
                    }
                    File dir = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS), "KrishiKhata");
                    dir.mkdirs();
                    File f = new File(dir, safe);
                    try (FileOutputStream fos = new FileOutputStream(f)) { fos.write(data); }
                    toast("Downloads/KrishiKhata ফোল্ডারে সেভ হয়েছে");
                    return;
                }
                toast("Downloads/KrishiKhata ফোল্ডারে সেভ হয়েছে");
                Intent open = new Intent(Intent.ACTION_VIEW).setDataAndType(uri, mime).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
                try { startActivity(open); } catch (Exception ignored) { }
            } catch (Exception e) {
                toast("ফাইল সেভ করা যায়নি");
            }
        }
    }
}
