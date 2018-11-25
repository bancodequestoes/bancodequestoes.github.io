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
});
