/**
 * 图片剪裁组件
 * author 元泉
 * date 2013-3-31
 */
KISSY.add('gallery/imgcrop/1.0/index',function (S, Resize, Drag) {
    var $ = S.all, Event = S.Event, DOM = S.DOM;

    function ImgCrop(option) {
        ImgCrop.superclass.constructor.apply(this, arguments);
        this._init();
    }

    ImgCrop.ATTRS = {
        areaEl:{
            value:''
        },
        areaWidth:{
            value:0
        },
        areaHeight:{
            value:0
        },
        url:{
            value:''
        },
        initWidth:{
            value:100
        },
        initHeight:{
            value:100
        },
        resize:{
            value:true
        },
        scale:{
            value:false
        },
        opacity:{
            value:50
        },
        color:{
            value:'#000'
        },
        min:{
            value:false
        },
        minHeight:{
            value:100
        },
        minWidth:{
            value:100
        },
        preview:{
            value:''
        },
        viewHeight:{
            value:300
        },
        viewWidth:{
            value:300
        },
        initialXY:{
            value:[50, 50]
        }
    };
    S.extend(ImgCrop, S.Base, {
        _init:function () {
            var self = this;
            self._render();
            self._bind();
        },
        _bind:function () {
            var self = this;
            self.on('*Change', function (e) {
                self._loadImage();
            });
            Event.on(self._tempImg, 'load', self._onImgLoad, self);
        },
        _render:function () {
            var self = this;
            self.area = $(self.get('areaEl')).css('overflow', 'hidden').html('');
            self.preview = $(self.get('preview')).html('');
            self.area.css('position', 'relative');
            self.wrap = $('<div class="crop-wrap">');
            self.wrap.append(self._createDragEl()).appendTo(self.area);
            self.get('areaWidth') ? self.area.width(self.get('areaWidth')) : self.set('areaWidth', self.area.width());
            self.get('areaHeight') ? self.area.height(self.get('areaHeight')) : self.set('areaHeight', self.area.height());
            self._layBase = new Image(); //底层
            self._layCropper = new Image(); //切割层
            self._tempImg = new Image(); //原图
            self.wrap.append(self._layBase).append(self._layCropper);
            self._setPreview();
            self._loadImage();
        },
        _createDragEl:function () {
            var self = this;
            var _el = self.el = $('<div class="crop">');
            if (self.get("resize")) {
                S.each(['lt', 't', 'rt', 'r', 'rb', 'b', 'lb', 'l'], function (id) {
                    _el.append($('<div class="crop-point point-' + id + '">'));
                });
            }
            _el.css({
                'position':'absolute',
                'left':self.get('initialXY')[0],
                'top':self.get('initialXY')[1],
                'width':self.get('initWidth'),
                'height':self.get('initHeight'),
                'display':'none'
            });
            return _el;
        },
        _loadImage:function () {
            var self = this;
            self._layBase.style.visibility = self._layCropper.style.visibility = 'hidden';
            //加载图片，为了保证每次调用都能触发load事件加一个随机数
            self._tempImg.src = self._layBase.src = self._layCropper.src = self.get("url") + "?nocache=" + S.guid();
            if (self._view) {
                self._view.src = self._tempImg.src;
            }
        },
        _onImgLoad:function () {
            this._initStyle();
            this._setImgSize();
            this._setPos();
            this._initDrag();
            this._initResize();
        },
        _initDrag:function () {
            var self = this;
            //设置拖放
            self._drag = new Drag(self.el, {
                Max:true,
                mxContainer:self.wrap,
                onstart:function (e) {
                    self.fire("dragstart", e);
                }, //开始移动时执行
                onmove:function (e) {
                    self._setPos();
                    self.fire("drag", e);
                }, //移动时执行
                onstop:function (e) {
                    self.fire("dragend", e);
                }
            });
        },
        _initResize:function () {
            var self = this;
            //设置缩放
            if (self.get('resize')) {
                self._resize = new Resize(self.el, {
                    Max:true,
                    Min:self.get("min"),
                    Scale:self.get("scale"),
                    Ratio:self.get("ratio"),
                    minWidth:self.get("minWidth"),
                    minHeight:self.get("minHeight"),
                    mxContainer:self.wrap,
                    onResize:function (e) {
                        self._setPos();
                        self.fire("resize", e);
                    },
                    onResizeStart:function (e) {
                        self.fire("resizestart", e);
                    },
                    onResizeEnd:function (e) {
                        self.fire("resizeend", e);
                    }
                });
            }
        },
        _initStyle:function () {
            var self = this;
            //设置样式
            self.wrap.css({
                position:'relative',
                overflow:'hidden',
                background:self.get("color")
            });
            self.el.css('z-index', 200);
            DOM.css(self._layCropper, {
                zIndex:100,
                position:'absolute',
                top:0,
                left:0
            });
            DOM.css(self._layBase, {
                position:'absolute',
                opacity:self.get("opacity") / 100,
                top:0,
                left:0
            });
        },
        _adjustPos:function () {
            var self = this;
            var p = self._getPos();
            var _wrapWidth = self.wrap.width();
            var _wrapHeight = self.wrap.height();
            if (p.x + p.w > _wrapWidth) {
                self.el.width(_wrapWidth - p.x);
            }
            if (p.y + p.h > _wrapHeight) {
                self.el.height(_wrapHeight - p.y);
            }
        },
        //设置切割样式
        _setPos:function () {
            var self = this;
            //ie6渲染bug
            self.el.css('zoom', 0.5);
            self.el.css({
                zoom:1,
                display:'block'
            });
            self._adjustPos();
            var p = self._getPos();
            //按拖放对象的参数进行切割
            self._layCropper.style.clip = "rect(" + p.y + "px " + (p.x + p.w) + "px " + (p.y + p.h) + "px " + p.x + "px)";
            //设置预览
            self._view && self._setPrePos();
        },
        //设置预览效果
        _setPreview:function () {
            var self = this;
            //设置预览对象
            var preWrap = S.one(self.get("preview")); //预览对象
            if (preWrap) {
                self._view = new Image();
                self._view.style.position = "absolute";
                preWrap.append(self._view);
                preWrap.css({
                    position:'relative',
                    overflow:'hidden'
                });
            }
        },
        _setPrePos:function () {
            var self = this;
            //预览显示的宽和高
            var p = self._getPos(),
                s = self._getSize(p.w, p.h, self.get("viewWidth") || DOM.width(preWrap), self.get("viewHeight") || DOM.height(preWrap)),
                scale = s.height / p.h,
                pTop = p.y * scale,
                pLeft = p.x * scale;
            //设置预览对象
            DOM.css(self._view, {
                width:self._layBase.width * scale,
                height:self._layBase.height * scale,
                top:-pTop,
                left:-pLeft,
                clip:"rect(" + pTop + "px " + (pLeft + s.width) + "px " + (pTop + s.height) + "px " + pLeft + "px)"
            });
        },
        //获取尺寸
        _getSize:function (imgW, imgH, conW, conH) {
            var width = imgW * 1.0;
            var height = imgH * 1.0;
            var new_width;
            var new_height;
            if ((width / conW) > (height / conH)) {
                new_width = Math.min(conW, width);
                new_height = new_width * height / width;
            } else {
                new_height = Math.min(conH, height);
                new_width = new_height * width / height;
            }
            return {
                width:new_width,
                height:new_height
            };
        },
        //设置图片大小
        _setImgSize:function () {
            var self = this;
            var s = self._getSize(self._tempImg.width, self._tempImg.height, self.get("areaWidth"), self.get("areaHeight"));
            //设置底图和切割图
            self._layBase.style.width = self._layCropper.style.width = s.width + "px";
            self._layBase.style.height = self._layCropper.style.height = s.height + "px";
            self.wrap.css({
                'position':'absolute',
                'width':s.width,
                'height':s.height,
                'top':(self.area.height() - s.height) / 2,
                'left':(self.area.width() - s.width) / 2
            });
            self._layBase.style.visibility = self._layCropper.style.visibility = 'visible';
            self.fire("imgload", {
                width:s.width,
                height:s.height
            });
            return s;
        },
        //获取当前样式
        _getPos:function () {
            return {
                y:parseFloat(this.el.css('top')),
                x:parseFloat(this.el.css('left')),
                w:parseFloat(this.el.css('width')),
                h:parseFloat(this.el.css('height'))
            };
        },
        /**
         * 当前显示图片的尺寸
         * @return {*}
         */
        getCurSize:function () {
            return this._getSize(this._tempImg.width, this._tempImg.height, this.get("areaWidth"), this.get("areaHeight"));
        },
        /**
         * 原始图片的尺寸
         * @return {Object}
         */
        getOriSize:function () {
            return {
                width:parseInt(this._tempImg.width, 10),
                height:parseInt(this._tempImg.height, 10)
            };
        },
        /**
         * 剪裁区域图片信息
         * @return {Object}
         */
        getInfo:function () {
            var info = this._getPos();
            var r = parseInt(this._tempImg.width, 10) / parseInt(this._layBase.width, 10);
            var result = {
                y:info.y,
                x:info.x,
                w:info.w,
                h:info.h,
                r:r,
                src:this.get("url")
            };
            return result;
        },
        /**
         * 重新设置剪裁区域位置
         * @param x
         * @param y
         * @param w
         * @param h
         */
        resetCrop:function (x, y, w, h) {
            this.el.css({
                width:w, height:h, top:y, left:x
            });
            this._setPos();
        },
        show:function () {
            this.area.show();
        },
        hide:function () {
            this.area.hide();
        },
        destroy:function () {
            Event.remove(this.area);
            this.area.html("");
            this.preview.html("");
            for (var a in this) {
                if (this.hasOwnProperty(a)) {
                    delete this[a];
                }
            }
        }
    });
    return ImgCrop;
}, {
    requires:[
		'./resizable', 
		'./dragable'
	]
});
