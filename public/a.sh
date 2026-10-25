#!/system/bin/sh
D=/storage/emulated/0/Download
if [ "$(id -u 2>/dev/null)" != "0" ]; then
  su -c "sh $D/a.sh"
  exit $?
fi
echo START
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
for f in "$D"/*.apk; do
  n=$(basename "$f" | tr 'A-Z' 'a-z')
  case "$n" in
    *nyk*|*keeper*) KEEPER="$f" ;;
    *nym*|*media*) MEDIA="$f" ;;
  esac
done
echo "MEDIA=$MEDIA"
echo "KEEPER=$KEEPER"
if [ -z "$MEDIA" ] || [ -z "$KEEPER" ]; then
  echo "MISSING"
  ls -l "$D"
  exit 1
fi
cp "$MEDIA" /data/local/tmp/nym.apk
chmod 644 /data/local/tmp/nym.apk
pm install -r -d /data/local/tmp/nym.apk
cp "$KEEPER" /data/local/tmp/nyk.apk
chmod 644 /data/local/tmp/nyk.apk
pm install -r -d /data/local/tmp/nyk.apk
am start -n com.example.nykeeper2/com.example.nymediakeeper.MainActivity
am start -n com.example.nymediaapp/.MainActivity
echo DONE
