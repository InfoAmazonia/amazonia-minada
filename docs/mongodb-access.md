# Acesso administrativo ao MongoDB

A porta do host é publicada somente em `127.0.0.1:27017`. Backend e importador
continuam usando `database:27017` pela rede Docker; não substitua esse endereço
interno por localhost nas aplicações.

Para conectar um cliente administrativo a partir de outro computador, abra:

```sh
ssh -N -L 127.0.0.1:27018:127.0.0.1:27017 root@207.180.233.132
```

Use a chave SSH e o arquivo known_hosts já configurados. A conexão do cliente
MongoDB será em `127.0.0.1:27018`, mantendo a autenticação do banco. Não inclua a
senha no comando ou no histórico. Encerre o processo SSH ao terminar.

Antes de trocar o mapeamento numa implantação existente, preserve Compose,
imagem, volumes e rede, faça backup e teste a restauração e a recriação em um
ambiente isolado. Recrie apenas o serviço do banco, sem remover volumes. Confira
as portas externas em IPv4/IPv6, túnel autenticado, site, APIs e CSV após a mudança.
O mapeamento de porta exige recriação do contêiner e breve interrupção das conexões.

No servidor atual, o banco pertence ao projeto Compose `amazonia-minada-back`.
A configuração equivalente foi aplicada no Compose desse projeto; o repositório
do backend fornece `docker-compose.mongo-localhost.yml` para substituir a lista
de portas com `!override`, evitando manter a publicação pública por merge.
A reversão de mapeamento preserva os dados e não exige restaurar o banco; retornar
à configuração anterior reabre o acesso público e deve ser apenas uma recuperação
temporária.
