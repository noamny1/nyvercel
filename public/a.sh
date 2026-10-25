#!/system/bin/sh
D=/storage/emulated/0/Download
LOG=$D/log.txt
if [ "$(id -u 2>/dev/null)" != "0" ]; then
  su -c "sh $D/a.sh"
  exit $?
fi
exec > "$LOG" 2>&1
echo START
df -h /data
echo "--- free ---"
rm -rf /data/dalvik-cache/* /cache/* /data/system/dropbox/* /data/anr/* /data/tombstones/* /data/local/tmp/* /data/app/vmdl*.tmp
pm trim-caches 999999999999
for p in com.google.android.youtube com.google.android.youtube.tv com.google.android.videos com.google.android.play.games com.android.chrome com.netflix.mediaclient com.google.android.apps.photos com.spotify.music org.mozilla.firefox; do
  pm uninstall --user 0 "$p"
done
df -h /data
echo "--- files ---"
ls -l "$D"/*.apk
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
  echo MISSING
  exit 1
fi
echo "--- install nym ---"
pm install -r -d "$MEDIA"
echo "--- install nyk ---"
pm install -r -d "$KEEPER"
am start -n com.example.nykeeper2/com.example.nymediakeeper.MainActivity
am start -n com.example.nymediaapp/.MainActivity
echo DONE
df -h /data
