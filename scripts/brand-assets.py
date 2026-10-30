"""Rebuild the approved 31 October 2026 logo assets.

Offline design utility only; requires Pillow, fontTools and Nimbus Sans fonts.
The deployed site serves the generated SVG/PNG/ICO files with no font dependency.
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen

OUT = Path(__file__).resolve().parents[1] / 'public'
FONT = '/usr/share/fonts/opentype/urw-base35/NimbusSans-Bold.otf'
REG = '/usr/share/fonts/opentype/urw-base35/NimbusSans-Regular.otf'
NAVY = '#050f20'
BLUE = '#78aaff'
GREEN = '#47e5ae'
SHIELD = 'M.5 0 .92 .17 V.5 C.92 .78 .75 .97 .5 1.09 C.25 .97 .08 .78 .08 .5 V.17 Z'
TICK = 'm.29 .49 .16 .16 .28 -.31'

def shield_svg(x, y, width, color=GREEN, small=False):
    # Keep the tiny header mark legible without enlarging the approved shape.
    outline = 'stroke-width=".9" vector-effect="non-scaling-stroke"' if small else 'stroke-width=".057"'
    tick = 'stroke-width=".9" vector-effect="non-scaling-stroke"' if small else 'stroke-width=".072"'
    return f'<g transform="translate({x:.3f} {y}) scale({width})" fill="none" stroke="{color}" stroke-linecap="round" stroke-linejoin="round"><path d="{SHIELD}" {outline}/><path d="{TICK}" {tick}/></g>'

def wordmark_svg(light=False):
    font = TTFont(FONT)
    glyphs = font.getGlyphSet()
    cmap = font.getBestCmap()
    scale = 100 / font['head'].unitsPerEm
    x = 8
    parts = []
    for i, char in enumerate('AgentCheck.'):
        glyph = glyphs[cmap[ord(char)]]
        pen = SVGPathPen(glyphs)
        glyph.draw(pen)
        color = ('#102441' if light else '#ffffff') if i < 5 else BLUE
        if char == '.':
            parts.append(f'<circle cx="{x + glyph.width * scale / 2:.3f}" cy="95.5" r="7.5" fill="#4b91ff"/>')
        else:
            parts.append(f'<path fill="{color}" transform="translate({x:.3f} 103) scale({scale} {-scale})" d="{pen.getCommands()}"/>')
        x += glyph.width * scale - 5.5
    x += 5.5
    parts.append(shield_svg(x + 11, 20, 29, '#00825c' if light else GREEN, small=True))
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 12 {x + 44:.3f} 120" role="img" aria-label="AgentCheck"><title>AgentCheck</title>{"".join(parts)}</svg>'

def shield(draw, x, y, width, color=GREEN):
    def curve(a, b, c, end):
        return [tuple((1-t)**3*a[j]+3*(1-t)**2*t*b[j]+3*(1-t)*t*t*c[j]+t**3*end[j] for j in range(2)) for t in [i/32 for i in range(33)]]
    points = [(.5,0),(.92,.17),(.92,.5)]
    points += curve((.92,.5),(.92,.78),(.75,.97),(.5,1.09))
    points += curve((.5,1.09),(.25,.97),(.08,.78),(.08,.5))
    points += [(.08,.17),(.5,0)]
    def line(coords, thickness):
        draw.line([(x+a*width,y+b*width) for a,b in coords], fill=color, width=max(1,round(thickness*width)), joint='curve')
        radius = thickness*width/2
        for a,b in coords:
            px, py = x+a*width, y+b*width
            draw.ellipse((px-radius,py-radius,px+radius,py+radius), fill=color)
    line(points,.057)
    line([(.29,.49),(.45,.65),(.73,.34)],.072)

def wordmark(draw, x, baseline, size, light=False):
    font = ImageFont.truetype(FONT, size)
    for i,char in enumerate('AgentCheck.'):
        color = ('#102441' if light else '#ffffff') if i < 5 else BLUE
        if char == '.':
            radius=size*.075
            cx=x+font.getlength(char)/2
            cy=baseline-radius
            draw.ellipse((cx-radius,cy-radius,cx+radius,cy+radius), fill='#4b91ff')
        else:
            draw.text((x,baseline),char,font=font,fill=color,anchor='ls')
        x += font.getlength(char)-size*.055
    x += size*.055
    shield(draw,x+size*.11,baseline-size*.83,size*.29,'#00825c' if light else GREEN)

for light, name in [(False,'agentcheck-wordmark-v3.svg'),(True,'agentcheck-wordmark-light-v3.svg')]:
    (OUT/name).write_text(wordmark_svg(light))

icon_svg = '<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" role="img" aria-label="AgentCheck"><title>AgentCheck shield and tick</title><rect width="512" height="512" rx="112" fill="'+NAVY+'"/>'+shield_svg(104,88,304)+'</svg>'
for name in ['agentcheck-icon-v3.svg','agentcheck-badge.svg','favicon.svg']:
    (OUT/name).write_text(icon_svg)

icon = Image.new('RGBA',(1536,1536),(0,0,0,0))
ImageDraw.Draw(icon).rounded_rectangle((0,0,1535,1535),radius=336,fill=NAVY)
shield(ImageDraw.Draw(icon),312,264,912)
for size,name in [(96,'favicon.png'),(180,'apple-touch-icon.png'),(512,'agentcheck-icon-v3.png')]:
    icon.resize((size,size),Image.Resampling.LANCZOS).save(OUT/name,optimize=True)
icon.resize((256,256),Image.Resampling.LANCZOS).save(OUT/'favicon.ico',sizes=[(16,16),(32,32),(48,48),(64,64)])

logo = Image.new('RGBA',(2400,520),(0,0,0,0))
wordmark(ImageDraw.Draw(logo),50,390,380,True)
logo.resize((1200,260),Image.Resampling.LANCZOS).save(OUT/'agentcheck-logo-v3.png',optimize=True)

share = Image.new('RGB',(2400,1260),NAVY)
draw = ImageDraw.Draw(share)
wordmark(draw,170,450,250)
draw.text((170,650),'Know your agent. Check the facts.',font=ImageFont.truetype(FONT,92),fill='#edf3ff',anchor='lt')
draw.text((170,825),'Independent NSW agent checks',font=ImageFont.truetype(REG,58),fill='#a9b9ce',anchor='lt')
share = share.resize((1200,630),Image.Resampling.LANCZOS)
share.save(OUT/'agentcheck-share-v3.png',optimize=True)
# Keep earlier direct image URLs consistent when link services refresh them.
for name in ['agentcheck-share.png','agentcheck-share-v2.png']:
    share.resize((600,315),Image.Resampling.LANCZOS).save(OUT/name,optimize=True)
