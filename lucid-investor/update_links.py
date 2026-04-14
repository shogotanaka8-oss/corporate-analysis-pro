import os
import re

html_files = ["index.html", "search.html", "analysis.html", "details.html", "watchlist.html"]

def replace_links(content):
    # Top nav bar links
    content = re.sub(r'<a([^>]+)href="[^"]*"([^>]*)>(ホーム)</a>', r'<a\1href="index.html"\2>\3</a>', content)
    content = re.sub(r'<a([^>]+)href="[^"]*"([^>]*)>(探索)</a>', r'<a\1href="search.html"\2>\3</a>', content)
    content = re.sub(r'<a([^>]+)href="[^"]*"([^>]*)>(ウォッチリスト)</a>', r'<a\1href="watchlist.html"\2>\3</a>', content)
    
    # Sidebar / Bottom nav links (they have span inside)
    # Search for <a ... href="...">...<span>ホーム</span>...</a>
    content = re.sub(r'(<a[^>]+href=")[^"]*("[^>]*>\s*<span[^>]*>[^<]*</span>\s*<span[^>]*>(ホーム)</span>\s*</a>)', r'\g<1>index.html\g<2>', content)
    content = re.sub(r'(<a[^>]+href=")[^"]*("[^>]*>\s*<span[^>]*>[^<]*</span>\s*<span[^>]*>(探索)</span>\s*</a>)', r'\g<1>search.html\g<2>', content)
    content = re.sub(r'(<a[^>]+href=")[^"]*("[^>]*>\s*<span[^>]*>[^<]*</span>\s*<span[^>]*>(ウォッチリスト|保存済み)</span>\s*</a>)', r'\g<1>watchlist.html\g<2>', content)
    
    return content

for file in html_files:
    if os.path.exists(file):
        with open(file, 'r', encoding='utf-8') as f:
            content = f.read()
        content = replace_links(content)
        with open(file, 'w', encoding='utf-8') as f:
            f.write(content)
print("Links updated successfully!")
