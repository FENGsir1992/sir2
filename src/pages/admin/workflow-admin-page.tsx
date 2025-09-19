import React from "react";
import { Button, Card, CardBody, Input, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Table, TableHeader, TableBody, TableColumn, TableRow, TableCell, Chip, Pagination, Spinner, Select, SelectItem, Checkbox } from "@heroui/react";
import { Icon } from "@iconify/react";
import { adminWorkflowsApi } from "../../utils/admin-api-client";
import { localMediaStore } from "../../utils/local-media-store";
import { Workflow } from "../../types/shared";

export default function WorkflowAdminPage() {
  const [items, setItems] = React.useState<Workflow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [keyword, setKeyword] = React.useState("");
  const [statusFilter, setStatusFilter] = React.useState<string>("");
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<Partial<Workflow> | null>(null);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());

  // 本地视频暂存与逐帧预览
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [localVideoFile, setLocalVideoFile] = React.useState<File | null>(null);
  const [localVideoUrl, setLocalVideoUrl] = React.useState<string | null>(null);
  const [videoDuration, setVideoDuration] = React.useState<number>(0);
  const [currentTime, setCurrentTime] = React.useState<number>(0);
  const requestFrameRef = React.useRef<number | null>(null);
  const videoPickerRef = React.useRef<HTMLInputElement | null>(null);
  const attachmentPickerRef = React.useRef<HTMLInputElement | null>(null);
  const [lastAttachmentName, setLastAttachmentName] = React.useState<string>("");

  const categories = React.useMemo(() => (
    [
      { key: "books", label: "推书" },
      { key: "parenting", label: "育儿" },
      { key: "emotion", label: "情感" },
      { key: "pets", label: "宠物" },
      { key: "english", label: "英语" },
      { key: "psychology", label: "心理学" },
      { key: "healing", label: "治愈" },
      { key: "ancient", label: "古风" },
      { key: "metaphysics", label: "玄学" },
      { key: "wellness", label: "养生" },
      { key: "business", label: "创业" },
      { key: "cognition", label: "认知" },
      { key: "tools", label: "工具" },
      { key: "other", label: "其他" },
    ]
  ), []);

  // 清理所有编辑器状态
  const cleanupEditorState = React.useCallback(() => {
    setLocalVideoFile(null);
    setLocalVideoUrl(null);
    setVideoDuration(0);
    setCurrentTime(0);
    setError(null);
    
    // 清理video引用
    if (videoRef.current) {
      videoRef.current.src = '';
      videoRef.current.load();
    }
    
    // 清理canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  }, []);

  const fetchList = React.useCallback(async (p = page, k = keyword, s = statusFilter) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminWorkflowsApi.list({ page: p, limit: 10, search: k, sortBy: "updatedAt", sortOrder: "desc", status: s });
      if ((resp as any).success && (resp as any).data) {
        const data = (resp as any).data;
        setItems(data.workflows as any);
        setTotalPages(data.pagination?.totalPages || 1);
      } else {
        setError((resp as any).error || (resp as any).message || "获取列表失败");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [page, keyword, statusFilter]);

  React.useEffect(() => { fetchList(1, "", ""); }, []);

  const isAllSelected = React.useMemo(() => items.length > 0 && items.every(it => selectedIds.has(it.id)), [items, selectedIds]);
  const toggleSelectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set<string>(prev);
      if (isAllSelected) {
        items.forEach(it => next.delete(it.id));
      } else {
        items.forEach(it => next.add(it.id));
      }
      return next;
    });
  };
  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set<string>(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const openCreate = () => {
    cleanupEditorState();
    setEditing({ title: "", description: "", price: 0, isFree: false, isVip: false, status: "draft", category: "other" } as any);
    setEditorOpen(true);
  };

  const openEdit = (w: Workflow) => {
    setEditing(w);
    setEditorOpen(true);
  };

  const handleSave = async () => {
    if (!editing) return;

    // 校验
    const title = (editing.title || "").trim();
    if (!title) {
      setError("标题为必填项");
      return;
    }

    const payload: any = {
      title,
      description: (editing.description || ""),
      shortDescription: (editing as any).shortDescription || "",
      price: editing.price ?? 0,
      isFree: editing.isFree ?? false,
      isVip: editing.isVip ?? false,
      isHot: (editing as any).isHot ?? false,
      cover: (editing as any).cover || "",
      previewVideo: (editing as any).previewVideo || "",
      demoVideo: (editing as any).demoVideo || "",
      attachments: Array.isArray((editing as any).attachments) ? (editing as any).attachments : undefined,
      category: (editing as any).category || "other",
      status: (editing as any).status || "draft"
    };

    // 若存在预览视频但未设置封面，自动从当前帧截取封面
    if ((!payload.cover || String(payload.cover).trim() === "") && (payload.previewVideo || localVideoUrl)) {
      try {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (video && canvas && video.readyState >= 2) {
          // 确保视频已加载元数据
          console.log('🎬 自动截取视频封面，视频尺寸:', video.videoWidth, 'x', video.videoHeight);
          
          const ctx = canvas.getContext('2d');
          const w = video.videoWidth || 1280;
          const h = video.videoHeight || 720;
          
          if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w;
            canvas.height = h;
          }
          
          if (ctx) {
            // 如果视频当前时间为0，设置到2秒处获取更好的帧
            if (video.currentTime === 0 && video.duration > 2) {
              video.currentTime = 2;
              // 等待seeked事件后再截取
              await new Promise<void>((resolve) => {
                const onSeeked = () => {
                  video.removeEventListener('seeked', onSeeked);
                  resolve();
                };
                video.addEventListener('seeked', onSeeked);
              });
            }
            
            ctx.drawImage(video, 0, 0, w, h);
            const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
            if (dataUrl && dataUrl.startsWith('data:image/')) {
              payload.cover = dataUrl;
              console.log('✅ 自动截取封面成功，数据长度:', dataUrl.length);
            }
          }
        }
      } catch (error) {
        console.error('自动截取封面失败:', error);
      }
    }

    // 若依然没有封面，阻止保存并提示
    if (!payload.cover || String(payload.cover).trim() === "") {
      setError('请先设置封面：可点击“截取当前帧作为封面”或让视频定位到合适画面后再保存');
      return;
    }

    // 调试信息
    if (payload.cover && payload.cover.startsWith('data:image/')) {
      console.log('🚀 发送工作流请求，包含 base64 封面');
      console.log('🚀 Cover 数据长度:', payload.cover.length);
      console.log('🚀 Cover 数据开头:', payload.cover.substring(0, 100) + '...');
    } else {
      console.log('🚀 发送工作流请求，封面数据:', payload.cover);
    }

    setLoading(true);
    try {
      const resp = editing.id
        ? await adminWorkflowsApi.update(editing.id as any, payload)
        : await adminWorkflowsApi.create(payload);
      if (!(resp as any).success) throw new Error((resp as any).error || (resp as any).message || "保存失败");
      // 保存成功后，把本地预览视频绑定到正式ID
      const realId = (editing.id as any) || (resp as any).data?.id;
      if (realId && localVideoFile) {
        await localMediaStore.savePreview(String(realId), localVideoFile);
      }
      cleanupEditorState();
      setEditorOpen(false);
      await fetchList();
      window.dispatchEvent(new CustomEvent('workflows:changed'));
      try { (await import('../../utils/api-client')).workflowApi.invalidateCache({ id: String(realId) }); } catch {}
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  // 本地视频文件变更时生成/释放URL
  React.useEffect(() => {
    if (localVideoFile) {
      const url = URL.createObjectURL(localVideoFile);
      setLocalVideoUrl(url);
      const workflowId = (editing as any)?.id || 'temp';
      localMediaStore.savePreview(String(workflowId), localVideoFile).catch(console.warn);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setLocalVideoUrl(null);
    }
  }, [localVideoFile]);

  // 绘制当前帧到canvas（尽可能逐帧）
  const drawFrameToCanvas = React.useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    ctx.drawImage(video, 0, 0, w, h);
  }, []);

  // 利用 requestVideoFrameCallback 实时预览每一帧（可用则用）
  const startFrameLoop = React.useCallback(() => {
    const video = videoRef.current as any;
    if (!video) return;
    if (typeof video.requestVideoFrameCallback === 'function') {
      const loop = () => {
        drawFrameToCanvas();
        requestFrameRef.current = video.requestVideoFrameCallback(loop);
      };
      requestFrameRef.current = video.requestVideoFrameCallback(loop);
    } else {
      // 回退：使用 timeupdate/seeked 事件触发绘制
      drawFrameToCanvas();
    }
  }, [drawFrameToCanvas]);

  // 已不再需要 stopFrameLoop，移除以通过构建

  const handleVideoLoaded = React.useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setVideoDuration(v.duration || 0);
    setCurrentTime(v.currentTime || 0);
    startFrameLoop();
  }, [startFrameLoop]);

  const handleTimeUpdate = React.useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    setCurrentTime(v.currentTime);
    drawFrameToCanvas();
  }, [drawFrameToCanvas]);

  const handleSeek = React.useCallback((t: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(t, v.duration || t));
  }, []);

  const stepFrame = React.useCallback((deltaSeconds: number) => {
    const v = videoRef.current;
    if (!v) return;
    const next = (v.currentTime || 0) + deltaSeconds;
    v.pause();
    v.currentTime = Math.max(0, Math.min(next, v.duration || next));
  }, []);

  const captureCoverFromCurrentFrame = React.useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    try {
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      console.log('📸 截取封面成功，数据长度:', dataUrl.length);
      console.log('📸 Base64 数据开头:', dataUrl.substring(0, 100) + '...');
      setEditing((s) => s ? ({ ...s, cover: dataUrl }) : null);
    } catch (e) {
      console.error('封面截取失败:', e);
      setError('封面截取失败');
    }
  }, []);

  const handleDelete = async (w: Workflow) => {
    if (!confirm(`确认删除「${w.title}」吗？`)) return;
    setLoading(true);
    try {
      const resp = await adminWorkflowsApi.remove(w.id);
      if (!(resp as any).success) throw new Error((resp as any).error || "删除失败");
      await fetchList();
      setSelectedIds((prev) => { const next = new Set(prev); next.delete(w.id); return next; });
      window.dispatchEvent(new CustomEvent('workflows:changed'));
      try { (await import('../../utils/api-client')).workflowApi.invalidateCache({ id: String(w.id) }); } catch {}
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) return;
    if (!confirm(`确认删除选中的 ${ids.length} 个工作流吗？`)) return;
    setLoading(true);
    try {
      await Promise.all(ids.map(async (id) => {
        const resp = await adminWorkflowsApi.remove(id);
        if (!(resp as any).success) throw new Error((resp as any).error || '删除失败');
      }));
      setSelectedIds(new Set());
      await fetchList(page, keyword, statusFilter);
      window.dispatchEvent(new CustomEvent('workflows:changed'));
      try { (await import('../../utils/api-client')).workflowApi.invalidateCache(); } catch {}
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicate = async (w: Workflow) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await adminWorkflowsApi.duplicate(w.id);
      if (!(resp as any).success) throw new Error((resp as any).error || "复制失败");
      
      // 🔧 显示成功消息
      const message = (resp as any).data?.message || `工作流 "${w.title}" 复制成功`;
      console.log(`✅ ${message}`);
      
      await fetchList(page, keyword, statusFilter);
      window.dispatchEvent(new CustomEvent('workflows:changed'));
      try { (await import('../../utils/api-client')).workflowApi.invalidateCache({ id: String(w.id) }); } catch {}
      
      // 可以考虑添加成功提示，比如 toast 通知
      // toast.success(message);
      
    } catch (e) {
      setError((e as Error).message);
      console.error('❌ 复制工作流失败:', e);
    } finally {
      setLoading(false);
    }
  };

  const onSearch = () => { setPage(1); fetchList(1, keyword, statusFilter); };

  const onStatusChange = (v: any) => {
    const val = Array.isArray(v) ? v[0] : v;
    setStatusFilter(val || "");
    setPage(1);
    fetchList(1, keyword, val || "");
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">工作流管理</h1>
        <div className="flex gap-2">
          <Input value={keyword} onValueChange={setKeyword} placeholder="搜索标题/作者/标签..." className="w-72" onKeyDown={(e) => { if (e.key === 'Enter') onSearch(); }} />
          <Select selectedKeys={statusFilter ? [statusFilter] : []} className="w-40" placeholder="全部状态" onSelectionChange={onStatusChange as any}>
            <SelectItem key="">全部状态</SelectItem>
            <SelectItem key="draft">草稿</SelectItem>
            <SelectItem key="published">已发布</SelectItem>
            <SelectItem key="archived">已归档</SelectItem>
          </Select>
          <Button color="primary" startContent={<Icon icon="lucide:search" />} onPress={onSearch}>搜索</Button>
          <Button variant="flat" startContent={<Icon icon="lucide:refresh-ccw" />} onPress={() => fetchList(page, keyword, statusFilter)}>刷新</Button>
          <Button color="danger" variant="flat" startContent={<Icon icon="lucide:trash-2" />} isDisabled={selectedIds.size === 0} onPress={handleBulkDelete}>批量删除</Button>
          <Button color="success" startContent={<Icon icon="lucide:plus" />} onPress={openCreate}>新建</Button>
        </div>
      </div>

      <Card>
        <CardBody>
          {loading && (
            <div className="py-10 text-center text-gray-500 flex items-center justify-center gap-2"><Spinner size="sm" /> 加载中...</div>
          )}
          {error && (
            <div className="py-3 text-red-500">{error}</div>
          )}
          {!loading && (
            <Table aria-label="workflow-table" removeWrapper>
              <TableHeader>
                <TableColumn>
                  <Checkbox isSelected={isAllSelected} onChange={toggleSelectAll} aria-label="全选" />
                </TableColumn>
                <TableColumn>标题</TableColumn>
                <TableColumn>作者</TableColumn>
                <TableColumn>价格</TableColumn>
                <TableColumn>状态</TableColumn>
                <TableColumn>更新时间</TableColumn>
                <TableColumn>操作</TableColumn>
              </TableHeader>
              <TableBody emptyContent={"暂无数据"} items={items}>
                {items.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell>
                      <Checkbox isSelected={selectedIds.has(w.id)} onChange={() => toggleSelectOne(w.id)} aria-label={`选择 ${w.title}`} />
                    </TableCell>
                    <TableCell>{w.title}</TableCell>
                    <TableCell>{w.author}</TableCell>
                    <TableCell>{w.isFree ? "免费" : `¥${Number(w.price || 0).toFixed(2)}`}</TableCell>
                    <TableCell>
                      <Chip size="sm" color={w.status === 'published' ? 'success' : w.status === 'draft' ? 'default' : 'warning'}>{w.status || 'draft'}</Chip>
                    </TableCell>
                    <TableCell>{(w as any).updatedAt ? new Date((w as any).updatedAt).toLocaleString() : '-'}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button size="sm" variant="flat" startContent={<Icon icon="lucide:copy" />} onPress={() => handleDuplicate(w)}>复制</Button>
                        <Button size="sm" variant="flat" startContent={<Icon icon="lucide:edit" />} onPress={() => openEdit(w)}>编辑</Button>
                        {/* 每日推荐切换按钮（快捷） */}
                        <Button size="sm" variant="flat" onPress={async () => {
                          try {
                            const next = !Boolean((w as any).isDailyRecommended);
                            const resp = await adminWorkflowsApi.update(w.id, { isDailyRecommended: next });
                            if ((resp as any).success !== false) {
                              fetchList(page, keyword, statusFilter);
                            }
                          } catch (err) {
                            alert('设置每日推荐失败：' + ((err as any)?.message || ''));
                          }
                        }}>{(w as any).isDailyRecommended ? '取消每日推荐' : '设为每日推荐'}</Button>
                        <Button size="sm" color="danger" variant="flat" startContent={<Icon icon="lucide:trash" />} onPress={() => handleDelete(w)}>删除</Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex justify-end mt-4">
            <Pagination total={totalPages} page={page} onChange={(p) => { setPage(p); fetchList(p, keyword, statusFilter); }} showControls />
          </div>
        </CardBody>
      </Card>

      <Modal isOpen={editorOpen} onOpenChange={setEditorOpen} size="xl">
        <ModalContent>
          <ModalHeader>{editing?.id ? '编辑工作流' : '新建工作流'}</ModalHeader>
          <ModalBody>
            <div className="grid grid-cols-12 gap-4">
              {/* 左侧：基础信息 */}
              <div className="col-span-12 md:col-span-6 space-y-3">
                <Input label="标题" value={editing?.title || ''} onValueChange={(v) => setEditing((s) => s ? ({ ...s, title: v }) : null)} />
                <Input label="价格" type="number" value={String(editing?.price ?? 0)} onValueChange={(v) => setEditing((s) => s ? ({ ...s, price: Number(v) }) : null)} />
                <div>
                  <div className="text-sm font-medium mb-2">分类</div>
                  <Select selectedKeys={[String(editing?.category || 'other')]} onSelectionChange={(keys) => {
                    const val = Array.isArray(keys) ? keys[0] : Array.from(keys)[0] || 'other';
                    setEditing((s) => s ? ({ ...s, category: String(val) }) : null);
                  }} aria-label="选择分类">
                    {categories.map(c => (
                      <SelectItem key={c.key}>{c.label}</SelectItem>
                    ))}
                  </Select>
                </div>
                <div className="flex items-center gap-6">
                  <Checkbox isSelected={Boolean(editing?.isVip)} onChange={(v) => setEditing((s) => s ? ({ ...s, isVip: Boolean(v) }) : null)}>
                    会员SVIP限时免费
                  </Checkbox>
                  <Checkbox isSelected={Boolean(editing?.isHot)} onChange={(v) => setEditing((s) => s ? ({ ...s, isHot: Boolean(v) }) : null)}>
                    火爆
                  </Checkbox>
                  <Checkbox isSelected={Boolean(editing?.isDailyRecommended)} onChange={(v) => setEditing((s) => s ? ({ ...s, isDailyRecommended: Boolean(v) }) : null)}>
                    每日推荐
                  </Checkbox>
                </div>
                <Input label="副标题/短描述" value={editing?.shortDescription || ''} onValueChange={(v) => setEditing((s) => s ? ({ ...s, shortDescription: v }) : null)} />
                <Select selectedKeys={[editing?.status || 'draft']} onSelectionChange={(keys) => {
                  const val = Array.isArray(keys) ? keys[0] : Array.from(keys)[0] || 'draft';
                  setEditing((s) => s ? ({ ...s, status: val as 'draft' | 'published' | 'archived' | 'featured' }) : null);
                }} label="状态">
                  <SelectItem key="draft">草稿</SelectItem>
                  <SelectItem key="published">已发布</SelectItem>
                  <SelectItem key="archived">已归档</SelectItem>
                </Select>
              </div>

              {/* 右侧：媒体与附件 */}
              <div className="col-span-12 md:col-span-6 space-y-3">
                <Input label="预览视频URL（悬停播放）" placeholder="例如 /uploads/videos/preview-1.mp4 或 https://..." value={editing?.previewVideo || ''} onValueChange={(v) => setEditing((s) => s ? ({ ...s, previewVideo: v }) : null)} />
                <Input label="演示视频URL（详情页播放）" placeholder="可选" value={editing?.demoVideo || ''} onValueChange={(v) => setEditing((s) => s ? ({ ...s, demoVideo: v }) : null)} />

                <div>
                  <div className="text-sm font-medium mb-2">上传本地视频（暂存到项目空间 /uploads/videos）</div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="flat" startContent={<Icon icon="lucide:upload" />} onPress={() => videoPickerRef.current?.click()}>选择视频文件</Button>
                    {localVideoFile && (
                      <span className="text-xs text-gray-500 truncate max-w-[220px]">{localVideoFile.name}</span>
                    )}
                  </div>
                <input ref={videoPickerRef} className="hidden" type="file" accept="video/*" onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    setLocalVideoFile(file);
                    // 直接上传到后台的项目空间，返回URL写入 previewVideo
                    (async () => {
                      try {
                        const { adminMediaApi } = await import('../../utils/admin-api-client');
                        const resp = await adminMediaApi.uploadPreviewVideo(file);
                        if ((resp as any).success && (resp as any).data?.url) {
                          setEditing((s) => ({ ...(s as any), previewVideo: (resp as any).data.url }));
                        }
                      } catch (err) {
                        console.error('上传预览视频失败', err);
                      }
                    })();
                  }
                }} />
                {localVideoUrl && (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <video
                        ref={videoRef}
                        src={localVideoUrl}
                        controls
                        onLoadedMetadata={handleVideoLoaded}
                        onTimeUpdate={handleTimeUpdate}
                        className="w-full rounded border"
                      />
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="flat" onPress={() => stepFrame(-1 / 25)}>上一帧</Button>
                        <Button size="sm" variant="flat" onPress={() => stepFrame(1 / 25)}>下一帧</Button>
                        <div className="text-xs text-gray-500">{currentTime.toFixed(2)}s / {videoDuration.toFixed(2)}s</div>
                      </div>
                      <div className="mt-2">
                        <input
                          type="range"
                          min={0}
                          max={videoDuration || 0}
                          step={0.01}
                          value={currentTime}
                          onChange={(e) => handleSeek(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                    <div>
                      <canvas ref={canvasRef} className="w-full rounded border bg-black" />
                      <div className="flex gap-2 mt-2">
                        <Button color="primary" size="sm" onPress={captureCoverFromCurrentFrame}>截取当前帧作为封面</Button>
                      </div>
                    </div>
                  </div>
                )}
                </div>
                <div>
                  <div className="text-sm font-medium mb-2">封面预览</div>
                  {(editing as any)?.cover ? (
                    <img src={(editing as any).cover} alt="封面预览" className="max-h-40 rounded border" />
                  ) : (
                    <div className="text-xs text-gray-400">尚未选择封面</div>
                  )}
                </div>

                {/* 附件上传（压缩包） */}
                <div>
                  <div className="text-sm font-medium mb-2">上传附件压缩包（保存到 /uploads/files）</div>
                  <div className="flex items-center gap-3">
                    <Button size="sm" variant="flat" startContent={<Icon icon="lucide:archive" />} onPress={() => attachmentPickerRef.current?.click()}>选择压缩包</Button>
                    {lastAttachmentName && (
                      <span className="text-xs text-gray-500 truncate max-w-[220px]">{lastAttachmentName}</span>
                    )}
                  </div>
                  <input
                    ref={attachmentPickerRef}
                    className="hidden"
                    type="file"
                    accept=".zip,.7z,.rar,.tar,.gz,.bz2,.xz,.tgz,.txz,.tbz2"
                    onChange={async (e) => {
                      const file = e.target.files && e.target.files[0];
                      if (!file) return;
                      try {
                        const { adminMediaApi } = await import('../../utils/admin-api-client');
                        const resp = await adminMediaApi.uploadAttachmentFile(file);
                        if ((resp as any).success && (resp as any).data?.url) {
                          setEditing((s) => {
                            const prev = ((s as any)?.attachments || []) as string[];
                            return { ...(s as any), attachments: [...prev, (resp as any).data.url] } as any;
                          });
                          setLastAttachmentName(file.name);
                        }
                      } catch (err) {
                        console.error('上传附件失败', err);
                      } finally {
                        if (e.currentTarget) e.currentTarget.value = '';
                      }
                    }}
                  />
                  {Array.isArray((editing as any)?.attachments) && (editing as any).attachments.length > 0 && (
                    <div className="mt-2 space-y-2">
                      {((editing as any).attachments as string[]).map((url: string, idx: number) => (
                        <div key={`${url}-${idx}`} className="flex items-center justify-between bg-gray-50 rounded border px-3 py-2">
                          <div className="text-xs truncate pr-3">{url}</div>
                          <Button size="sm" variant="light" color="danger" onPress={() => {
                            setEditing((s) => {
                              const list = [ ...(((s as any)?.attachments || []) as string[]) ];
                              list.splice(idx, 1);
                              return { ...(s as any), attachments: list } as any;
                            });
                          }}>移除</Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {/* 结束右侧 */}
              {/* 移除详细描述输入，根据需求不再显示 */}
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="flat" onPress={() => {
              cleanupEditorState();
              setEditorOpen(false);
            }}>取消</Button>
            <Button color="primary" onPress={handleSave} startContent={<Icon icon="lucide:save" />}>保存</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}



