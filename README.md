# skillrosa

Açık kaynak agent skill'lerini (SKILL.md) indeksleyen statik site. Backend yok, **içerik kopyalanmaz**:
indeks saatlik güncellenir, SKILL.md kaynak depodan (commit'e sabitli URL ile) canlı okunur.

## Nasıl çalışır

1. `scripts/sync.py` `sources.json`'daki depoları `git fetch --depth 1` ile günceller (çalışma önbelleği).
2. `scripts/build.py` frontmatter'ları okuyup `dist/` içine yalnızca indeks yazar. İlk çalıştırma "baseline"
   sayılır; sonradan görülen her skill `first_seen` alır, `new.json` ve `feed.xml` içinde yeni olarak çıkar.
3. İnsan sayfası (`skill.html`) ve AI'lar SKILL.md'yi doğrudan GitHub'dan çeker (jsDelivr, olmazsa raw).

## Çıktılar (`dist/`)

| Dosya | Ne |
|---|---|
| `llms.txt` | AI için talimat ve uç noktalar |
| `catalog.txt`, `catalog/<kategori>.txt` | Her satır: `id<TAB>katman<TAB>kategori<TAB>açıklama` |
| `skills.json` | Yapılandırılmış tam indeks |
| `new.json`, `feed.xml` | Son 14 günde eklenenler |
| `skills/<id>/meta.json` | Kaynak, lisans, uyarılar, commit'e sabitli dosya URL'leri, kurulum komutu |
| `candidates.json` | Awesome-list'lerde geçen ama indekste olmayan depolar (elle onay için) |

## Sunucuya kurulum (Oracle)

```bash
sudo apt-get install -y git python3 python3-pip nginx   # Oracle Linux'ta: dnf install
# projeyi sunucuya kopyala, sonra:
./deploy/install.sh https://skills.senin-alanin.com
```

`install.sh` ilk build'i yapar, saatlik systemd timer'ı ve nginx ayarını kurar.
Oracle Cloud'da 80/443 portlarını VCN Security List'te ve sunucu güvenlik duvarında açmayı unutma.
HTTPS için: `sudo certbot --nginx -d skills.senin-alanin.com`.

## Yeni kaynak ekleme

`candidates.json` içindeki bir depoyu incele, uygunsa `sources.json`'a ekle (`tier`: official / curated /
community / aggregated). Bir sonraki saatlik çalışmada indekse girer.

## Güvenlik ve lisans

- Skill içerikleri üçüncü taraftandır. `llms.txt` AI'lara kurmadan önce okumalarını söyler.
- "dikkat" etiketleri (pipe-to-shell, base64-decode, credential-paths, bundled-scripts) basit sezgisel taramadır.
- ClawHub / openclaw arşivi bilerek dışarıda: belgelenmiş kötü amaçlı skill kampanyaları var.
- Sayfada içerik yalnızca izinli lisanslarda (MIT, Apache-2.0, BSD, CC0, CC-BY, CC-BY-SA) gösterilir.
  Derleme (aggregated) katmanında depo lisansı yetmez, skill düzeyinde lisans aranır.
