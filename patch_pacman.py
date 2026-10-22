import re

with open(r'c:\Users\parks\Desktop\학교프로젝트\metro-pacman\index.html', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. </main> 앞에 controlBar 삽입
control_bar = '''
  <!-- 조작 안내 + 부스트 게이지 -->
  <div id="controlBar" style="display:none;width:100%;max-width:608px;margin:8px auto 0;font-family:monospace;font-size:12px;color:#92b8c7;box-sizing:border-box;">
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;padding:4px 4px;">
      <div style="display:flex;gap:18px;flex-wrap:wrap;">
        <span>← → ↑ ↓ &nbsp;이동</span>
        <span><b style="color:#e9fbff;">SPACE</b> &nbsp;부스트</span>
        <span><b style="color:#e9fbff;">P</b> &nbsp;일시정지</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="color:#92b8c7;font-size:11px;">BOOST</span>
        <div style="width:110px;height:12px;background:#0b1728;border:1px solid #2a3a50;border-radius:3px;overflow:hidden;">
          <div id="boostBarOuter" style="height:100%;width:100%;background:#70ff8b;border-radius:3px;transition:width 0.12s;box-shadow:0 0 6px #70ff8b;"></div>
        </div>
        <span id="boostLabel" style="font-size:11px;color:#70ff8b;min-width:40px;">READY</span>
      </div>
    </div>
  </div>
'''
content = content.replace('  </main>', control_bar + '  </main>')

# 2. 기존 boostHud DOM 코드 제거 (이전에 캔버스 안에 넣었던 것)
content = content.replace(
    '<div id="boostHud" style="position:absolute;bottom:12px;right:12px;font-family:monospace;font-size:11px;pointer-events:none;z-index:5;">\n          <div style="color:#555;margin-bottom:2px;text-align:right;">BOOST</div>\n          <div style="width:80px;height:7px;background:#1a2230;border:1px solid #2a3a50;border-radius:2px;">\n            <div id="boostBar" style="height:100%;width:100%;background:#70ff8b;border-radius:2px;transition:width 0.1s;"></div>\n          </div>\n        </div>',
    ''
)

# 3. updateUI 안의 boostHud/boostBar 코드를 boostBarOuter/boostLabel 로 교체
old_ui = '''      const boostHud = document.getElementById("boostHud");
      const boostBar = document.getElementById("boostBar");
      if (boostHud && boostBar) {
        const playing = game.state === "PLAYING" || game.state === "READY";
        boostHud.style.display = playing ? "block" : "none";
        if (game.boost > 0) {
          boostBar.style.background = "#70ff8b";
          boostBar.style.width = (game.boost / 1.35 * 100) + "%";
          boostBar.style.boxShadow = "0 0 6px #70ff8b";
        } else if (game.boostCool > 0) {
          boostBar.style.background = "#3a5a3a";
          boostBar.style.width = ((1 - game.boostCool / 7) * 100) + "%";
          boostBar.style.boxShadow = "none";
        } else {
          boostBar.style.background = "#70ff8b";
          boostBar.style.width = "100%";
          boostBar.style.boxShadow = "0 0 8px #70ff8b";
        }
      }'''

new_ui = '''      const controlBar = document.getElementById("controlBar");
      const boostBarOuter = document.getElementById("boostBarOuter");
      const boostLabel = document.getElementById("boostLabel");
      const playing2 = ["PLAYING","READY","STAGE CLEAR"].includes(game.state);
      if (controlBar) controlBar.style.display = playing2 ? "block" : "none";
      if (boostBarOuter && boostLabel) {
        if (game.boost > 0) {
          boostBarOuter.style.background = "#70ff8b";
          boostBarOuter.style.width = (game.boost / 1.35 * 100) + "%";
          boostBarOuter.style.boxShadow = "0 0 8px #70ff8b";
          boostLabel.style.color = "#70ff8b";
          boostLabel.textContent = "ACTIVE";
        } else if (game.boostCool > 0) {
          boostBarOuter.style.background = "#2a5a2a";
          boostBarOuter.style.width = str(round((1 - game.boostCool / 7) * 100)) + "%";
          boostBarOuter.style.boxShadow = "none";
          boostLabel.style.color = "#555";
          boostLabel.textContent = Math.ceil(game.boostCool) + "s";
        } else {
          boostBarOuter.style.background = "#70ff8b";
          boostBarOuter.style.width = "100%";
          boostBarOuter.style.boxShadow = "0 0 10px #70ff8b";
          boostLabel.style.color = "#70ff8b";
          boostLabel.textContent = "READY";
        }
      }'''

# Python의 str() 실수 수정 - JS 코드라서 그냥 문자열로
new_ui = new_ui.replace(
    'boostBarOuter.style.width = str(round((1 - game.boostCool / 7) * 100)) + "%";',
    'boostBarOuter.style.width = ((1 - game.boostCool / 7) * 100).toFixed(1) + "%";'
)

if old_ui in content:
    content = content.replace(old_ui, new_ui)
    print("updateUI replaced OK")
else:
    print("updateUI old not found - trying partial match")
    # updateUI가 없으면 function updateUI 시작에 추가
    content = content.replace(
        '    function updateUI() {',
        '    function updateUI() {\n' + new_ui
    )

with open(r'c:\Users\parks\Desktop\학교프로젝트\metro-pacman\index.html', 'w', encoding='utf-8') as f:
    f.write(content)

print("controlBar:", "controlBar" in content)
print("boostBarOuter:", "boostBarOuter" in content)
print("boostLabel:", "boostLabel" in content)
