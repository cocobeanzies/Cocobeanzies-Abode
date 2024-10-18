import os
from math import *
from PIL import Image
import numpy as np
import subprocess

def max_size(w, h, maxsize, force=False):
	s = w * h
	m = maxsize * maxsize
	if s > m or force:
		r = (m / s) ** 0.5
		w = round(w * r)
		h = round(h * r)
	return w, h

def optimise(im, keep_rgb=True, recurse=True, max_frames=60):
	try:
		if not recurse:
			raise TypeError
		it = iter(im)
	except TypeError:
		pass
	else:
		if not im:
			return im
		try:
			i0 = next(it)
			if type(i0) is type(im):
				raise StopIteration
		except StopIteration:
			return []
		i0 = optimise(i0, keep_rgb=keep_rgb, recurse=False)
		out = [i0]
		orig = []
		mode = i0.mode
		changed = False
		for i, i2 in enumerate(it):
			if i >= max_frames and not changed:
				print("Unchanged:", mode, i0, i2)
				return resume(i0, out, it)
			orig.append(i2)
			if i2.mode != mode:
				changed = True
				i2 = optimise(i2, keep_rgb=keep_rgb, recurse=False)
				if i2.mode != mode:
					return [im.convert(i2.mode) for im in resume(i0, orig, it)]
			out.append(i2)
		return out
	if isinstance(im, dict):
		raise TypeError(im)
	original = im.mode
	try:
		if im.mode == "P":
			if keep_rgb:
				im = im.convert("RGBA")
			else:
				return im
		if im.mode == "L":
			if keep_rgb:
				return (im := im.convert("RGB"))
			return im
		if im.mode == "LA":
			A = im.getchannel("A")
			if (a := np.min(A)) >= 254:
				return (im := im.convert("L"))
			return im
		if im.mode == "RGBA":
			if keep_rgb:
				A = im.getchannel("A")
				if (a := np.min(A)) >= 254:
					return (im := im.convert("RGB"))
				print("UO:", a)
				return im
			R, G, B, A = im.split()
			r, g, b = np.asarray(R, dtype=np.uint8), np.asarray(G, dtype=np.uint8), np.asarray(B, dtype=np.uint8)
			distRG = np.abs(r.ravel() - g.ravel())
			if np.max(distRG) <= 2:
				distGB = np.abs(g.ravel() - b.ravel())
				if np.max(distGB) <= 2:
					distBR = np.abs(b.ravel() - r.ravel())
					if np.max(distBR) <= 2:
						if (a := np.min(A)) >= 254:
							return im.convert("L")
						print("UO:", a)
						return (im := im.convert("LA"))
			if (a := np.min(A)) >= 254:
				return (im := im.convert("RGB"))
			print("UO:", a)
			return im
		if keep_rgb:
			if im.mode != "RGB":
				return (im := im.convert("RGB"))
			return im
		R, G, B = im.split()
		r, g, b = np.asarray(R, dtype=np.uint8), np.asarray(G, dtype=np.uint8), np.asarray(B, dtype=np.uint8)
		distRG = np.abs(r.ravel() - g.ravel())
		if np.max(distRG) <= 2:
			distGB = np.abs(g.ravel() - b.ravel())
			if np.max(distGB) <= 2:
				distBR = np.abs(b.ravel() - r.ravel())
				if np.max(distBR) <= 2:
					return (im := im.convert("L"))
		return im
	finally:
		print("OP:", original, im.mode)

procs = []
def start_proc(sfn, dfn, im, fmt, w, h, alpha, animated, lossless):
	while len(procs) > 4:
		procs.pop(0).wait()
	is_png = sfn.endswith(".png")
	if is_png:
		args = ["ffmpeg", "-y", "-f", "rawvideo", "-r", "1", "-pix_fmt", "rgba" if im.mode == "RGBA" else "rgb24", "-video_size", "x".join(map(str, im.size)), "-i", "-", "-max_muxing_queue_size", "99999"]
	else:
		args = ["ffmpeg", "-y", "-i", sfn, "-max_muxing_queue_size", "99999"]
	true_lossless = lossless and not animated
	if fmt == "webp":
		args.extend(("-vf", f"scale={w}:{h}:flags=area", "-c:v", "libwebp_anim" if animated else "libwebp", "-pix_fmt", ("bgra" if alpha else "bgr24") if true_lossless else ("yuva420p" if alpha else "yuv420p"), "-lossless", *(("1",) if true_lossless else ("0", "-quality", "90" if true_lossless else "75")), "-compression_level", "6", "-loop", "0"))
	elif fmt == "avif":
		pix = "bgrp" if true_lossless else "yuv420p"
		bitrate = 16 * 1024 * 1024 if true_lossless else 1024 * 1024
		vc = "libaom-av1" if true_lossless or w & 1 or h & 1 else "libsvtav1"
		if alpha:
			b1 = floor(bitrate * 3 / 4)
			b2 = floor(bitrate / 4)
			cv1 = (vc, "-crf", "0") if true_lossless else (vc, "-b:v:0", str(b1), "-b:v:1", str(b2))
			cv = ("-c:v:0", *cv1, "-pix_fmt:v:0", pix, "-usage", "realtime", "-cpu-used", "3")
			args.extend(("-filter_complex", f"[0:v]scale={w}:{h}:flags=area,format=rgba[scaled];" + "[scaled]split=2[v1][v2];[v2]alphaextract[v2]", "-map", "[v1]", "-map", "[v2]", "-f", "avif", *cv, "-c:v:1", "libaom-av1", "-pix_fmt:1", "gray", "-usage", "realtime", "-cpu-used", "3", "-y", "-g", "300"))
		else:
			args.extend(("-vf", f"scale={w}:{h}:flags=area"))
			cv1 = (vc, "-crf", "0") if true_lossless else (vc, "-b:v", str(bitrate))
			cv = ("-c:v", *cv1, "-pix_fmt", pix, "-usage", "realtime", "-cpu-used", "3")
			args.extend(("-f", "avif", *cv))
		if animated:
			args.extend(("-loop", "0", "-q:v", "24"))
		elif lossless:
			args.extend(("-lossless", "1"))
		else:
			args.extend(("-q:v", "24"))
	else:
		raise NotImplementedError(fmt)
	args.append(dfn)
	print(sfn, dfn, fmt, w, h, alpha, animated, lossless, args)
	if is_png:
		proc = subprocess.Popen(args, stdin=subprocess.PIPE)
		proc.stdin.write(np.asanyarray(im).data)
		proc.stdin.close()
	else:
		proc = subprocess.Popen(args)
	procs.append(proc)
	return proc

lossless = False
fmts = ("avif", "webp")

inputs = """
"coco.gif"
"."
384
False

"pictures/galaxy.png"
"pictures"
384
False

"pictures/Snowdrop_Cacao.png"
"pictures"
384
True

"pictures/Gold_Bean_Sausage.png"
"pictures"
384
True

"pictures/Together.png"
"pictures"
3840
False

"pictures/Wainbow_Pee_Enn_Gee.png"
"pictures"
2560
False

"pictures/Roseland.png"
"pictures"
3840
False

"pictures/Roseland_Sun.png"
"pictures"
2560
False

"pictures/Roseland_Gradient.png"
"pictures"
3840
False

"pictures/Roseland_Clouds.png"
"pictures"
3840
False

"pictures/Roseland_Clouds2.png"
"pictures"
3840
False

"pictures/Roseland_Leaves.png"
"pictures"
3840
False

"pictures/Roseland_1.png"
"pictures"
3840
False

"pictures/Roseland_2.png"
"pictures"
3840
False

"pictures/Roseland_3.png"
"pictures"
3840
False

"pictures/Roseland_Bottom.png"
"pictures"
3840
True

"styles-source/animated"
"styles-full/animated"
16384
False

"styles-source"
"styles-full"
16384
True

"styles-source"
"styles"
384
False

"clouds-source"
"clouds"
256
False

"jwst-source"
"jwst"
128
False
"""

for info in inputs.split("\n\n"):
	source, dest, size, lossless = map(eval, info.strip().splitlines())
	fmtm = [fmts[-1]] if lossless else fmts
	if not os.path.exists(dest):
		d2 = dest.rsplit("/", 1)[0]
		if d2 != dest and not os.path.exists(d2):
			os.mkdir(d2)
		os.mkdir(dest)
	for fmt in fmtm:
		if os.path.isdir(source):
			for style in sorted(os.listdir(source)):
				fold = source + "/" + style
				if os.path.isdir(fold):
					dfold = dest + "/" + style
					if not os.path.exists(dfold):
						os.mkdir(dfold)
					for fn in sorted(os.listdir(fold)):
						sfn = fold + "/" + fn
						dfn = dfold + "/" + fn.rsplit(".", 1)[0] + "." + fmt
						if os.path.exists(dfn) and os.path.getsize(dfn) and os.path.getmtime(dfn) > os.path.getmtime(sfn):
							continue
						im = Image.open(sfn)
						w, h = max_size(*im.size, size, force=False)
						im2 = optimise(im, max_frames=1)
						alpha = "A" in im2.mode
						try:
							im.seek(1)
						except Exception:
							animated = False
						else:
							animated = True
						start_proc(sfn, dfn, im2, fmt, w, h, alpha, animated, lossless)
				else:
					fn = style
					sfn = fold
					dfn = dest + "/" + fn.rsplit(".", 1)[0] + "." + fmt
					if os.path.exists(dfn) and os.path.getsize(dfn) and os.path.getmtime(dfn) > os.path.getmtime(sfn):
						continue
					im = Image.open(sfn)
					w, h = max_size(*im.size, size, force=False)
					im2 = optimise(im, max_frames=1)
					alpha = "A" in im2.mode
					try:
						im.seek(1)
					except Exception:
						animated = False
					else:
						animated = True
					start_proc(sfn, dfn, im2, fmt, w, h, alpha, animated, lossless)
		else:
			fn = source.replace("\\", "/").rsplit("/", 1)[-1]
			sfn = source
			dfn = dest + "/" + fn.rsplit(".", 1)[0] + "." + fmt
			if os.path.exists(dfn) and os.path.getsize(dfn) and os.path.getmtime(dfn) > os.path.getmtime(sfn):
				continue
			im = Image.open(sfn)
			w, h = max_size(*im.size, size, force=False)
			im2 = optimise(im, max_frames=1)
			alpha = "A" in im2.mode
			try:
				im.seek(1)
			except Exception:
				animated = False
			else:
				animated = True
			start_proc(sfn, dfn, im2, fmt, w, h, alpha, animated, lossless)

for proc in procs:
	proc.wait()