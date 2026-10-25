#!/system/bin/sh
echo "מפעיל התקנה"
settings put global install_non_market_apps 1
settings put secure install_non_market_apps 1
settings put global package_verifier_enable 0
settings put global verifier_verify_adb_installs 0
pm enable com.android.packageinstaller
pm enable com.google.android.packageinstaller
appops set com.android.packageinstaller REQUEST_INSTALL_PACKAGES allow
appops set com.android.documentsui REQUEST_INSTALL_PACKAGES allow
settings put global auto_time 0
settings put global auto_time_zone 0
date 102516302026.00
MEDIA=""
KEEPER=""
for f in $(find /sdcard /storage /mnt -iname '*.apk' 2>/dev/null); do
  n=$(basename "$f" | tr 'A-Z' 'a-z')
  case "$n" in
    *nyk*|*keeper*) KEEPER="$f" ;;
    *nym*|*media*) MEDIA="$f" ;;
  esac
done
if [ -z "$MEDIA" ] || [ -z "$KEEPER" ]; then
  echo "לא נמצאו שני הקבצים"
  exit 1
fi
echo "NYM: $MEDIA"
cp "$MEDIA" /data/local/tmp/nym.apk && chmod 644 /data/local/tmp/nym.apk
pm install -r -d /data/local/tmp/nym.apk || exit 1
echo "NYK: $KEEPER"
cp "$KEEPER" /data/local/tmp/nyk.apk && chmod 644 /data/local/tmp/nyk.apk
pm install -r -d /data/local/tmp/nyk.apk || exit 1
am start -n com.example.nykeeper2/com.example.nymediakeeper.MainActivity
am start -n com.example.nymediaapp/.MainActivity
echo "הסתיים"
