var keepLoading = true;

$(function(){

    $("#question-search").focus();

    $(".form-question-search").submit(function(){

        var text = $(this).find("#question-search").val().trim() ;

        if (text == ""){

            $("#question-search").focus();

            return false;
        };

        return true;
    });

    $("#btn-i-am-lucky").click(function(){

        var url = "https://api.github.com/repos/bancodequestoes/linguagem-c/git/trees/master";

        $.ajax({url: url, type: "GET",
            success: function(files) {

                var folders = files.tree || [];

                folders = folders.filter(i => i.type === "tree");
                var folder = folders[Math.floor(Math.random() * folders.length)];

                $.ajax({ url: folder.url, type: "GET",
                    success: function(files) {

                        var items = files.tree || [];
                        var item = items[Math.floor(Math.random() * items.length)];

                        var url = "https://api.github.com/repos/bancodequestoes/linguagem-c/contents/";
                        var path = folder.path + "/" + item.path;

                        $.ajax({ url: url+path, type: "GET",
                            success: function(file) {
                                window.location = file.html_url;
                            }
                        });
                    }
                });
            }
        });
    })
});
