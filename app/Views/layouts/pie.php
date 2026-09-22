<?php
$rutaAssets = dirname(__DIR__, 3) . '/public/assets';
$verJs = @filemtime($rutaAssets . '/main.js') ?: time();
?>
    </div>
    <script type="module" src="<?php echo rutaBase(); ?>/assets/main.js?v=<?php echo $verJs; ?>"></script>
</body>
</html>
