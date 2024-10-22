<script lang="ts">
	const { data } = $props();
</script>

<h1>Profil</h1>
<p>{data.firstname}</p>
<p>{data.lastname}</p>
<p>{data.age} ans</p>
